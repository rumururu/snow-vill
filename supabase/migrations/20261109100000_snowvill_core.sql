-- Snow Village (prefix snowvill_) — M1 core schema on the shared mkideabox-games project.
-- Shared-backend rules (mkideabox-corp-process/processes/infrastructure/game-shared-backend.md):
--   * every object starts with snowvill_
--   * tables: RLS on, no policies, all table/sequence grants revoked from public/anon/authenticated
--   * the app calls only the security-definer functions granted to anon below
--   * invalid input → SQLSTATE 22023 (HTTP 400), rate limit → PT429 (HTTP 429)
-- No Supabase Auth: ownership is a random secret returned once; only its SHA-256 is stored.

create table snowvill_villages (
  id text primary key check (id ~ '^[a-km-z2-9]{10}$'),
  name text not null check (char_length(name) between 1 and 20),
  owner_hash bytea not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table snowvill_houses (
  id uuid primary key default gen_random_uuid(),
  village_id text not null references snowvill_villages (id) on delete cascade,
  slot smallint not null check (slot between 0 and 7),
  nickname text not null check (char_length(nickname) between 1 and 10),
  style text not null check (style in ('wood', 'sage', 'indigo')),
  message text not null default '' check (char_length(message) <= 60),
  photo_path text,
  claim_hash bytea not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (village_id, slot)
);
create index snowvill_houses_created_by on snowvill_houses (village_id, created_by);

create table snowvill_reports (
  id bigint generated always as identity primary key,
  house_id uuid not null references snowvill_houses (id) on delete cascade,
  reason text not null check (char_length(reason) <= 200),
  reporter uuid not null,
  created_at timestamptz not null default now()
);

create table snowvill_calls (
  install_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index snowvill_calls_lookup on snowvill_calls (install_id, action, at);
create index snowvill_calls_at on snowvill_calls (at);

alter table snowvill_villages enable row level security;
alter table snowvill_houses enable row level security;
alter table snowvill_reports enable row level security;
alter table snowvill_calls enable row level security;
revoke all on snowvill_villages, snowvill_houses, snowvill_reports, snowvill_calls from public, anon, authenticated;
revoke all on sequence snowvill_reports_id_seq from public, anon, authenticated;

-- ---------- internal helpers (no app access) ----------

-- Strip control characters, collapse whitespace, trim. Multiline keeps single line breaks.
create or replace function snowvill_clean_text(p text, p_multiline boolean)
returns text language sql immutable set search_path = public as $$
  select case when p_multiline then
    btrim(regexp_replace(regexp_replace(regexp_replace(coalesce(p, ''),
      '[\x01-\x09\x0B-\x1F\x7F]', ' ', 'g'), '[ \t]+', ' ', 'g'), '\n{3,}', E'\n\n', 'g'), E' \n')
  else
    btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[\x01-\x1F\x7F]', ' ', 'g'), '\s+', ' ', 'g'))
  end
$$;

create or replace function snowvill_hash(p text)
returns bytea language sql immutable set search_path = public, extensions as $$
  select digest(coalesce(p, ''), 'sha256')
$$;

create or replace function snowvill_new_secret()
returns text language sql volatile set search_path = public, extensions as $$
  select translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_')
$$;

create or replace function snowvill_new_village_id()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'abcdefghijkmnopqrstuvwxyz23456789';
  b bytea;
  v text;
begin
  loop
    b := gen_random_bytes(10);
    v := '';
    for i in 0..9 loop
      v := v || substr(alphabet, (get_byte(b, i) % 33) + 1, 1);
    end loop;
    exit when not exists (select 1 from snowvill_villages where id = v);
  end loop;
  return v;
end $$;

-- Per-install request limit. Rows older than one day are purged on every call.
create or replace function snowvill_rate_limit(p_install_id uuid, p_action text, p_per_minute int, p_per_day int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_install_id is null then
    raise exception 'install id required' using errcode = '22023';
  end if;
  delete from snowvill_calls where at < now() - interval '1 day';
  if (select count(*) from snowvill_calls
      where install_id = p_install_id and action = p_action and at > now() - interval '1 minute') >= p_per_minute
     or (select count(*) from snowvill_calls where install_id = p_install_id and action = p_action) >= p_per_day then
    raise exception 'rate limited' using errcode = 'PT429';
  end if;
  insert into snowvill_calls (install_id, action) values (p_install_id, p_action);
end $$;

create or replace function snowvill_house_json(h snowvill_houses)
returns json language sql stable set search_path = public as $$
  select json_build_object('id', h.id, 'slot', h.slot, 'nickname', h.nickname, 'style', h.style,
    'message', h.message, 'has_photo', h.photo_path is not null, 'created_at', h.created_at)
$$;

-- ---------- app functions (anon) ----------

create or replace function snowvill_create_village(p_install_id uuid, p_name text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := snowvill_clean_text(p_name, false);
  v_id text;
  v_secret text;
begin
  if char_length(v_name) not between 1 and 20 then
    raise exception 'invalid village name' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'create', 3, 20);
  v_id := snowvill_new_village_id();
  v_secret := snowvill_new_secret();
  insert into snowvill_villages (id, name, owner_hash, created_by)
    values (v_id, v_name, snowvill_hash(v_secret), p_install_id);
  return json_build_object('id', v_id, 'owner_secret', v_secret);
end $$;

-- Returns null when the village does not exist. Never exposes photo paths or secrets.
create or replace function snowvill_get_village(p_village_id text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', v.id, 'name', v.name, 'created_at', v.created_at,
    'houses', coalesce((select json_agg(snowvill_house_json(h) order by h.slot)
                        from snowvill_houses h where h.village_id = v.id), '[]'::json))
  from snowvill_villages v where v.id = p_village_id
$$;

-- Atomic claim: the village row is locked, then UNIQUE(village_id, slot) decides collisions.
create or replace function snowvill_claim_house(
  p_install_id uuid, p_village_id text, p_slot int, p_nickname text, p_style text, p_message text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_nick text := snowvill_clean_text(p_nickname, false);
  v_msg text := snowvill_clean_text(p_message, true);
  v_secret text;
  v_house snowvill_houses;
begin
  if p_slot is null or p_slot not between 0 and 7
     or char_length(v_nick) not between 1 and 10
     or p_style is null or p_style not in ('wood', 'sage', 'indigo')
     or char_length(v_msg) > 60 then
    raise exception 'invalid house input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'claim', 6, 60);

  perform 1 from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if exists (select 1 from snowvill_houses where village_id = p_village_id and created_by = p_install_id) then
    return json_build_object('ok', false, 'reason', 'ALREADY_JOINED');
  end if;
  if (select count(*) from snowvill_houses where village_id = p_village_id) >= 8 then
    return json_build_object('ok', false, 'reason', 'VILLAGE_FULL');
  end if;

  v_secret := snowvill_new_secret();
  insert into snowvill_houses (village_id, slot, nickname, style, message, claim_hash, created_by)
    values (p_village_id, p_slot, v_nick, p_style, v_msg, snowvill_hash(v_secret), p_install_id)
    on conflict (village_id, slot) do nothing
    returning * into v_house;
  if v_house.id is null then
    return json_build_object('ok', false, 'reason', 'SLOT_TAKEN');
  end if;
  return json_build_object('ok', true, 'claim_secret', v_secret, 'house', snowvill_house_json(v_house));
end $$;

create or replace function snowvill_report(p_install_id uuid, p_house_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_reason text := snowvill_clean_text(p_reason, false);
begin
  if p_house_id is null or char_length(v_reason) > 200 then
    raise exception 'invalid report' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'report', 5, 30);
  insert into snowvill_reports (house_id, reason, reporter)
    select h.id, v_reason, p_install_id from snowvill_houses h where h.id = p_house_id;
end $$;

-- ---------- Edge Function helpers (service_role only) ----------

-- Role a secret grants on a house: 'resident' (claim secret), 'owner' (village owner secret) or null.
create or replace function snowvill_house_access(p_house_id uuid, p_secret text)
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('village_id', h.village_id, 'photo_path', h.photo_path,
    'role', case when h.claim_hash = snowvill_hash(p_secret) then 'resident'
                 when v.owner_hash = snowvill_hash(p_secret) then 'owner' end)
  from snowvill_houses h join snowvill_villages v on v.id = h.village_id
  where h.id = p_house_id
$$;

create or replace function snowvill_village_access(p_village_id text, p_secret text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select owner_hash = snowvill_hash(p_secret) from snowvill_villages where id = p_village_id), false)
$$;

create or replace function snowvill_photo_path(p_village_id text, p_house_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select photo_path from snowvill_houses where id = p_house_id and village_id = p_village_id
$$;

-- Sets the photo path and returns the previous one (to delete from storage).
create or replace function snowvill_set_photo(p_house_id uuid, p_path text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  select photo_path into v_old from snowvill_houses where id = p_house_id for update;
  update snowvill_houses set photo_path = p_path where id = p_house_id;
  return v_old;
end $$;

create or replace function snowvill_delete_house(p_house_id uuid)
returns text language sql security definer set search_path = public as $$
  delete from snowvill_houses where id = p_house_id returning photo_path
$$;

-- Deletes the village (houses and reports cascade) and returns photo paths to remove from storage.
create or replace function snowvill_delete_village(p_village_id text)
returns setof text language plpgsql security definer set search_path = public as $$
begin
  return query select photo_path from snowvill_houses where village_id = p_village_id and photo_path is not null;
  delete from snowvill_villages where id = p_village_id;
end $$;

-- ---------- grants ----------

revoke all on function snowvill_clean_text(text, boolean) from public, anon, authenticated, service_role;
revoke all on function snowvill_hash(text) from public, anon, authenticated, service_role;
revoke all on function snowvill_new_secret() from public, anon, authenticated, service_role;
revoke all on function snowvill_new_village_id() from public, anon, authenticated, service_role;
revoke all on function snowvill_house_json(snowvill_houses) from public, anon, authenticated, service_role;
revoke all on function snowvill_rate_limit(uuid, text, int, int) from public, anon, authenticated;
revoke all on function snowvill_create_village(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_get_village(text) from public, anon, authenticated;
revoke all on function snowvill_claim_house(uuid, text, int, text, text, text) from public, anon, authenticated;
revoke all on function snowvill_report(uuid, uuid, text) from public, anon, authenticated;
revoke all on function snowvill_house_access(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_village_access(text, text) from public, anon, authenticated;
revoke all on function snowvill_photo_path(text, uuid) from public, anon, authenticated;
revoke all on function snowvill_set_photo(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_delete_house(uuid) from public, anon, authenticated;
revoke all on function snowvill_delete_village(text) from public, anon, authenticated;

grant execute on function snowvill_create_village(uuid, text) to anon;
grant execute on function snowvill_get_village(text) to anon;
grant execute on function snowvill_claim_house(uuid, text, int, text, text, text) to anon;
grant execute on function snowvill_report(uuid, uuid, text) to anon;

grant execute on function snowvill_rate_limit(uuid, text, int, int) to service_role;
grant execute on function snowvill_house_access(uuid, text) to service_role;
grant execute on function snowvill_village_access(text, text) to service_role;
grant execute on function snowvill_photo_path(text, uuid) to service_role;
grant execute on function snowvill_set_photo(uuid, text) to service_role;
grant execute on function snowvill_delete_house(uuid) to service_role;
grant execute on function snowvill_delete_village(text) to service_role;
