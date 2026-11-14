-- Accounts and private villages (dedicated snow-village project only — the shared game project has no Auth).
-- docs/12-accounts-and-private-villages.md. Guests keep the secret model; a signed-in caller (auth.uid())
-- is recognised in addition to the secrets.
--
-- * Villages/houses remember the signed-in creator (owner_user / user_id), stamped by triggers so the
--   existing create/claim functions stay unchanged.
-- * visibility: public (anyone with the link) | private (owner, residents and approved members only).
-- * snowvill_members: join requests (pending) and approved members of private villages; sign-in required.

alter table snowvill_villages
  add column if not exists owner_user uuid references auth.users (id) on delete set null,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private'));
alter table snowvill_houses
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists snowvill_villages_owner_user on snowvill_villages (owner_user);
create index if not exists snowvill_houses_user_id on snowvill_houses (user_id);

create table if not exists snowvill_members (
  village_id text not null references snowvill_villages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  nickname text not null check (char_length(nickname) between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (village_id, user_id)
);
create index if not exists snowvill_members_user on snowvill_members (user_id);
alter table snowvill_members enable row level security;
revoke all on snowvill_members from public, anon, authenticated;

-- ---------------------------------------------------------------- roles and access

-- The caller's relation to a village: owner | resident | member | pending | null.
create or replace function snowvill_role(p_village_id text, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p_user is null then null
    when exists (select 1 from snowvill_villages where id = p_village_id and owner_user = p_user) then 'owner'
    when exists (select 1 from snowvill_houses where village_id = p_village_id and user_id = p_user) then 'resident'
    else (select case m.status when 'approved' then 'member' else 'pending' end
          from snowvill_members m where m.village_id = p_village_id and m.user_id = p_user)
  end
$$;

-- May this caller see the village's houses, messages and photos? Public villages: anyone.
-- Private: owner, residents, approved members, or a guest holding the owner secret or a house's claim secret.
create or replace function snowvill_can_view(p_village_id text, p_user uuid, p_secrets text[])
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((
    select v.visibility = 'public'
        or snowvill_role(v.id, p_user) in ('owner', 'resident', 'member')
        or exists (select 1 from unnest(coalesce(p_secrets, '{}')) s
                   where char_length(s) <= 100
                     and (snowvill_hash(s) = v.owner_hash
                          or exists (select 1 from snowvill_houses h
                                     where h.village_id = v.id and h.claim_hash = snowvill_hash(s))))
    from snowvill_villages v where v.id = p_village_id), false)
$$;

-- Edge Function helpers (service role): the secret OR the signed-in user grants access.
drop function if exists snowvill_village_access(text, text);
create or replace function snowvill_village_access(p_village_id text, p_secret text, p_user uuid default null)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select owner_hash = snowvill_hash(p_secret) or (p_user is not null and owner_user = p_user)
                   from snowvill_villages where id = p_village_id), false)
$$;

drop function if exists snowvill_house_access(uuid, text);
create or replace function snowvill_house_access(p_house_id uuid, p_secret text, p_user uuid default null)
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('village_id', h.village_id, 'photo_path', h.photo_path,
    'role', case when h.claim_hash = snowvill_hash(p_secret) or (p_user is not null and h.user_id = p_user) then 'resident'
                 when v.owner_hash = snowvill_hash(p_secret) or (p_user is not null and v.owner_user = p_user) then 'owner' end)
  from snowvill_houses h join snowvill_villages v on v.id = h.village_id
  where h.id = p_house_id
$$;

-- Photo path only for callers who may view the village.
drop function if exists snowvill_photo_path(text, uuid);
create or replace function snowvill_photo_path(p_village_id text, p_house_id uuid, p_user uuid default null, p_secrets text[] default null)
returns text language sql stable security definer set search_path = public as $$
  select h.photo_path from snowvill_houses h
  where h.id = p_house_id and h.village_id = p_village_id and snowvill_can_view(p_village_id, p_user, p_secrets)
$$;

-- ---------------------------------------------------------------- stamping and private rules

create or replace function snowvill_villages_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_user is null then new.owner_user := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists snowvill_villages_stamp on snowvill_villages;
create trigger snowvill_villages_stamp before insert on snowvill_villages
  for each row execute function snowvill_villages_stamp();

create or replace function snowvill_houses_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_visibility text;
begin
  select visibility into v_visibility from snowvill_villages where id = new.village_id;
  if v_visibility = 'private' and coalesce(snowvill_role(new.village_id, v_uid), '') not in ('owner', 'member') then
    raise exception 'private village' using errcode = '42501';
  end if;
  if v_uid is not null then
    if exists (select 1 from snowvill_houses where village_id = new.village_id and user_id = v_uid) then
      raise exception 'already lives here' using errcode = '23505';
    end if;
    new.user_id := v_uid;
  end if;
  return new;
end $$;
drop trigger if exists snowvill_houses_stamp on snowvill_houses;
create trigger snowvill_houses_stamp before insert on snowvill_houses
  for each row execute function snowvill_houses_stamp();

-- ---------------------------------------------------------------- reading a village

drop function if exists snowvill_get_village(text);
create or replace function snowvill_get_village(p_village_id text, p_secrets text[] default null)
returns json language sql stable security definer set search_path = public as $$
  select case when snowvill_can_view(v.id, auth.uid(), p_secrets) then
    json_build_object('id', v.id, 'name', v.name, 'created_at', v.created_at, 'capacity', v.capacity,
      'open_halves', v.open_halves, 'path_style', v.path_style, 'decor', v.decor, 'visibility', v.visibility,
      'locked', false,
      'me', json_build_object('role', snowvill_role(v.id, auth.uid()),
              'house_id', (select h.id from snowvill_houses h where h.village_id = v.id and h.user_id = auth.uid() and auth.uid() is not null)),
      'houses', coalesce((select json_agg(snowvill_house_json(h) order by h.slot)
                          from snowvill_houses h where h.village_id = v.id), '[]'::json))
  else
    -- Private and not allowed: only what the join-request screen needs.
    json_build_object('id', v.id, 'name', v.name, 'visibility', v.visibility, 'locked', true,
      'me', json_build_object('role', snowvill_role(v.id, auth.uid()), 'house_id', null))
  end
  from snowvill_villages v where v.id = p_village_id
$$;

-- ---------------------------------------------------------------- owner look (secret or signed-in owner)

create or replace function snowvill_set_village_look(
  p_install_id uuid, p_village_id text, p_owner_secret text, p_path_style text, p_decor jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash bytea;
  v_owner uuid;
begin
  if p_path_style is null or p_path_style not in ('dirt', 'stones', 'brick', 'snow')
     or p_decor is null or not snowvill_valid_decor(p_decor)
     or char_length(coalesce(p_owner_secret, '')) > 100 then
    raise exception 'invalid look input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'look', 10, 200);
  select owner_hash, owner_user into v_hash, v_owner from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if not (v_hash = snowvill_hash(p_owner_secret) or (auth.uid() is not null and v_owner = auth.uid())) then
    return json_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;
  update snowvill_villages set path_style = p_path_style, decor = p_decor where id = p_village_id;
  return json_build_object('ok', true, 'path_style', p_path_style, 'decor', p_decor);
end $$;

-- ---------------------------------------------------------------- account functions (sign-in required)

-- Moves what this device made as a guest to the signed-in account. Only unbound items with a matching secret.
create or replace function snowvill_link_device(p_owner jsonb, p_houses jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_villages int := 0;
  v_houses int := 0;
  r record;
begin
  if v_uid is null then raise exception 'sign-in required' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_owner, '{}')) <> 'object' or jsonb_typeof(coalesce(p_houses, '{}')) <> 'object' then
    raise exception 'invalid input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(v_uid, 'link', 10, 100);
  for r in select key, value from jsonb_each_text(coalesce(p_owner, '{}')) limit 200 loop
    update snowvill_villages set owner_user = v_uid
      where id = r.key and owner_user is null and owner_hash = snowvill_hash(r.value);
    if found then v_villages := v_villages + 1; end if;
  end loop;
  for r in select key, value from jsonb_each_text(coalesce(p_houses, '{}')) limit 200 loop
    if r.key !~ '^[0-9a-f-]{36}$' then continue; end if;
    update snowvill_houses h set user_id = v_uid
      where h.id = r.key::uuid and h.user_id is null and h.claim_hash = snowvill_hash(r.value)
        and not exists (select 1 from snowvill_houses o where o.village_id = h.village_id and o.user_id = v_uid);
    if found then v_houses := v_houses + 1; end if;
  end loop;
  return json_build_object('villages', v_villages, 'houses', v_houses);
end $$;

-- Villages the signed-in caller owns, lives in, belongs to or asked to join.
create or replace function snowvill_my_villages()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
    select v.id, v.name, v.capacity, v.visibility, v.created_at, snowvill_role(v.id, auth.uid()) as role,
      (select count(*) from snowvill_houses h where h.village_id = v.id) as houses,
      case when v.owner_user = auth.uid() then
        (select count(*) from snowvill_members m where m.village_id = v.id and m.status = 'pending') else 0 end as pending
    from snowvill_villages v
    where auth.uid() is not null and (
      v.owner_user = auth.uid()
      or exists (select 1 from snowvill_houses h where h.village_id = v.id and h.user_id = auth.uid())
      or exists (select 1 from snowvill_members m where m.village_id = v.id and m.user_id = auth.uid()))
  ) x
$$;

-- Owner: public or private. Private needs a signed-in owner (members are accounts).
create or replace function snowvill_set_visibility(p_village_id text, p_visibility text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign-in required' using errcode = '42501'; end if;
  if p_visibility not in ('public', 'private') then raise exception 'invalid visibility' using errcode = '22023'; end if;
  update snowvill_villages set visibility = p_visibility where id = p_village_id and owner_user = auth.uid();
  if not found then return json_build_object('ok', false, 'reason', 'FORBIDDEN'); end if;
  return json_build_object('ok', true, 'visibility', p_visibility);
end $$;

-- Signed-in visitor asks to join a private village.
create or replace function snowvill_request_join(p_village_id text, p_nickname text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_nick text := snowvill_clean_text(p_nickname, false);
  v_role text;
begin
  if auth.uid() is null then raise exception 'sign-in required' using errcode = '42501'; end if;
  if char_length(v_nick) not between 1 and 10 then raise exception 'invalid nickname' using errcode = '22023'; end if;
  if not exists (select 1 from snowvill_villages where id = p_village_id and visibility = 'private') then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  perform snowvill_rate_limit(auth.uid(), 'join', 5, 50);
  v_role := snowvill_role(p_village_id, auth.uid());
  if v_role is not null then return json_build_object('ok', true, 'role', v_role); end if;
  insert into snowvill_members (village_id, user_id, nickname) values (p_village_id, auth.uid(), v_nick)
    on conflict do nothing;
  return json_build_object('ok', true, 'role', 'pending');
end $$;

-- Owner: pending requests and approved members.
create or replace function snowvill_members_of(p_village_id text)
returns json language sql stable security definer set search_path = public as $$
  select case when snowvill_role(p_village_id, auth.uid()) = 'owner' then
    coalesce((select json_agg(json_build_object('user_id', m.user_id, 'nickname', m.nickname, 'status', m.status,
                'created_at', m.created_at) order by m.status desc, m.created_at)
              from snowvill_members m where m.village_id = p_village_id), '[]'::json)
  end
$$;

-- Owner: approve (pending → approved) or remove (reject a request / remove a member).
create or replace function snowvill_decide_member(p_village_id text, p_user_id uuid, p_approve boolean)
returns json language plpgsql security definer set search_path = public as $$
begin
  if snowvill_role(p_village_id, auth.uid()) is distinct from 'owner' then
    return json_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;
  if p_approve then
    update snowvill_members set status = 'approved' where village_id = p_village_id and user_id = p_user_id;
  else
    delete from snowvill_members where village_id = p_village_id and user_id = p_user_id;
  end if;
  return json_build_object('ok', found);
end $$;

-- Account deletion (service role, from the Edge Function after verifying the caller's token):
-- owned villages (with every house) and the caller's houses elsewhere go; returns photo paths to remove.
create or replace function snowvill_delete_account(p_user uuid)
returns setof text language plpgsql security definer set search_path = public, auth as $$
begin
  return query
    select h.photo_path from snowvill_houses h join snowvill_villages v on v.id = h.village_id
    where (v.owner_user = p_user or h.user_id = p_user) and h.photo_path is not null;
  delete from snowvill_villages where owner_user = p_user;
  delete from snowvill_houses where user_id = p_user;
  delete from snowvill_members where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;

-- ---------------------------------------------------------------- grants

revoke all on function snowvill_role(text, uuid) from public, anon, authenticated;
revoke all on function snowvill_can_view(text, uuid, text[]) from public, anon, authenticated;
revoke all on function snowvill_village_access(text, text, uuid) from public, anon, authenticated;
revoke all on function snowvill_house_access(uuid, text, uuid) from public, anon, authenticated;
revoke all on function snowvill_photo_path(text, uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function snowvill_villages_stamp() from public, anon, authenticated;
revoke all on function snowvill_houses_stamp() from public, anon, authenticated;
revoke all on function snowvill_delete_account(uuid) from public, anon, authenticated;
grant execute on function snowvill_village_access(text, text, uuid) to service_role;
grant execute on function snowvill_house_access(uuid, text, uuid) to service_role;
grant execute on function snowvill_photo_path(text, uuid, uuid, text[]) to service_role;
grant execute on function snowvill_delete_account(uuid) to service_role;

revoke all on function snowvill_get_village(text, text[]) from public;
revoke all on function snowvill_set_village_look(uuid, text, text, text, jsonb) from public;
grant execute on function snowvill_get_village(text, text[]) to anon, authenticated;
grant execute on function snowvill_set_village_look(uuid, text, text, text, jsonb) to anon, authenticated;

-- Signed-in only.
revoke all on function snowvill_link_device(jsonb, jsonb) from public, anon;
revoke all on function snowvill_my_villages() from public, anon;
revoke all on function snowvill_set_visibility(text, text) from public, anon;
revoke all on function snowvill_request_join(text, text) from public, anon;
revoke all on function snowvill_members_of(text) from public, anon;
revoke all on function snowvill_decide_member(text, uuid, boolean) from public, anon;
grant execute on function snowvill_link_device(jsonb, jsonb) to authenticated;
grant execute on function snowvill_my_villages() to authenticated;
grant execute on function snowvill_set_visibility(text, text) to authenticated;
grant execute on function snowvill_request_join(text, text) to authenticated;
grant execute on function snowvill_members_of(text) to authenticated;
grant execute on function snowvill_decide_member(text, uuid, boolean) to authenticated;

-- The functions guests call stay callable after signing in (role authenticated instead of anon).
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'snowvill\_%' and has_function_privilege('anon', p.oid, 'execute')
  loop
    execute format('grant execute on function %s to authenticated', r.f);
  end loop;
end $$;
