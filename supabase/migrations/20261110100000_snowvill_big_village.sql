-- Snow Village "big village" upgrade (owner decision 2026-11-10): free villages hold up to 6 houses;
-- more than 6 is a paid big village (8 houses, same layout). Decorations are free and derived from the
-- house count on the client (4 → sled, 6 → snowman family, 8 → aurora), so they need no table.
--
-- Payment model (same shape as ldm/claires wallets): app-store purchase → RevenueCat →
-- snowvill-purchase-webhook credits the buyer's wallet (RevenueCat app user id = the app's install id);
-- the app then spends one credit to upgrade a village (anyone may gift it). Refunds take unspent credits
-- back, never below zero; an applied upgrade stays.

alter table snowvill_villages add column capacity smallint not null default 6 check (capacity in (6, 8));

create table snowvill_wallets (
  install_id uuid primary key,
  credits int not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table snowvill_purchases (
  transaction_id text primary key,
  install_id uuid not null,
  product_id text not null,
  credits int not null check (credits > 0),
  price numeric,
  price_usd numeric,
  currency text,
  store text,
  environment text,
  purchased_at timestamptz not null default now(),
  refunded_at timestamptz
);
create index snowvill_purchases_install on snowvill_purchases (install_id);

create table snowvill_upgrades (
  village_id text primary key references snowvill_villages (id) on delete cascade,
  upgraded_by uuid not null,
  created_at timestamptz not null default now()
);

alter table snowvill_wallets enable row level security;
alter table snowvill_purchases enable row level security;
alter table snowvill_upgrades enable row level security;
revoke all on snowvill_wallets, snowvill_purchases, snowvill_upgrades from public, anon, authenticated;

-- Product → credits (one place; unknown products credit nothing).
create or replace function snowvill_product_credits(p_product_id text)
returns int language sql immutable set search_path = public as $$
  select case p_product_id when 'snowvillage_big_village' then 1 else 0 end
$$;

-- ---------- app functions (anon) ----------

create or replace function snowvill_wallet(p_install_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('credits', coalesce((select credits from snowvill_wallets where install_id = p_install_id), 0))
$$;

create or replace function snowvill_upgrade_village(p_install_id uuid, p_village_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_capacity smallint;
  v_credits int;
begin
  perform snowvill_rate_limit(p_install_id, 'upgrade', 10, 50);
  select capacity into v_capacity from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if v_capacity >= 8 then
    return json_build_object('ok', false, 'reason', 'ALREADY_BIG');
  end if;
  select credits into v_credits from snowvill_wallets where install_id = p_install_id for update;
  if coalesce(v_credits, 0) < 1 then
    return json_build_object('ok', false, 'reason', 'NO_CREDIT');
  end if;
  update snowvill_wallets set credits = credits - 1, updated_at = now() where install_id = p_install_id;
  update snowvill_villages set capacity = 8 where id = p_village_id;
  insert into snowvill_upgrades (village_id, upgraded_by) values (p_village_id, p_install_id);
  return json_build_object('ok', true, 'capacity', 8, 'credits', v_credits - 1);
end $$;

-- get_village now also returns capacity.
create or replace function snowvill_get_village(p_village_id text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', v.id, 'name', v.name, 'created_at', v.created_at, 'capacity', v.capacity,
    'houses', coalesce((select json_agg(snowvill_house_json(h) order by h.slot)
                        from snowvill_houses h where h.village_id = v.id), '[]'::json))
  from snowvill_villages v where v.id = p_village_id
$$;

-- claim_house: the village's capacity (6 or 8) decides VILLAGE_FULL. Body otherwise unchanged.
create or replace function snowvill_claim_house(
  p_install_id uuid, p_village_id text, p_slot int, p_nickname text, p_style text, p_message text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_nick text := snowvill_clean_text(p_nickname, false);
  v_msg text := snowvill_clean_text(p_message, true);
  v_secret text;
  v_house snowvill_houses;
  v_capacity smallint;
begin
  if p_slot is null or p_slot not between 0 and 7
     or char_length(v_nick) not between 1 and 10
     or p_style is null or p_style not in ('wood', 'sage', 'indigo')
     or char_length(v_msg) > 60 then
    raise exception 'invalid house input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'claim', 6, 60);

  select capacity into v_capacity from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if exists (select 1 from snowvill_houses where village_id = p_village_id and created_by = p_install_id) then
    return json_build_object('ok', false, 'reason', 'ALREADY_JOINED');
  end if;
  if (select count(*) from snowvill_houses where village_id = p_village_id) >= v_capacity then
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

-- ---------- webhook functions (service_role) ----------

create or replace function snowvill_credit_purchase(
  p_install_id uuid, p_transaction_id text, p_product_id text,
  p_price numeric, p_price_usd numeric, p_currency text, p_store text, p_environment text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_credits int := snowvill_product_credits(p_product_id);
  v_new boolean;
begin
  if p_install_id is null or coalesce(p_transaction_id, '') = '' then
    raise exception 'invalid purchase' using errcode = '22023';
  end if;
  if v_credits = 0 then
    return json_build_object('credited', 0, 'reason', 'UNKNOWN_PRODUCT');
  end if;
  insert into snowvill_purchases (transaction_id, install_id, product_id, credits, price, price_usd, currency, store, environment)
    values (p_transaction_id, p_install_id, p_product_id, v_credits, p_price, p_price_usd, p_currency, p_store, p_environment)
    on conflict (transaction_id) do nothing
    returning true into v_new;
  if v_new is null then
    return json_build_object('credited', 0, 'reason', 'DUPLICATE');
  end if;
  insert into snowvill_wallets (install_id, credits) values (p_install_id, v_credits)
    on conflict (install_id) do update set credits = snowvill_wallets.credits + v_credits, updated_at = now();
  return json_build_object('credited', v_credits, 'credits', (select credits from snowvill_wallets where install_id = p_install_id));
end $$;

create or replace function snowvill_refund_purchase(p_transaction_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  p snowvill_purchases;
begin
  update snowvill_purchases set refunded_at = now()
    where transaction_id = p_transaction_id and refunded_at is null
    returning * into p;
  if p.transaction_id is null then
    return json_build_object('refunded', 0);
  end if;
  update snowvill_wallets set credits = greatest(credits - p.credits, 0), updated_at = now()
    where install_id = p.install_id;
  return json_build_object('refunded', 1, 'credits', (select coalesce(credits, 0) from snowvill_wallets where install_id = p.install_id));
end $$;

-- RevenueCat TRANSFER (restore under another app user id): move remaining credits to the new id.
create or replace function snowvill_transfer(p_from uuid[], p_to uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_moved int;
begin
  select coalesce(sum(credits), 0) into v_moved from snowvill_wallets where install_id = any(p_from) and install_id <> p_to;
  update snowvill_wallets set credits = 0, updated_at = now() where install_id = any(p_from) and install_id <> p_to;
  update snowvill_purchases set install_id = p_to where install_id = any(p_from) and install_id <> p_to;
  if v_moved > 0 then
    insert into snowvill_wallets (install_id, credits) values (p_to, v_moved)
      on conflict (install_id) do update set credits = snowvill_wallets.credits + v_moved, updated_at = now();
  end if;
  return json_build_object('moved', v_moved);
end $$;

-- ---------- grants ----------
revoke all on function snowvill_product_credits(text) from public, anon, authenticated, service_role;
revoke all on function snowvill_wallet(uuid) from public, anon, authenticated;
revoke all on function snowvill_upgrade_village(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_get_village(text) from public, anon, authenticated;
revoke all on function snowvill_claim_house(uuid, text, int, text, text, text) from public, anon, authenticated;
revoke all on function snowvill_credit_purchase(uuid, text, text, numeric, numeric, text, text, text) from public, anon, authenticated;
revoke all on function snowvill_refund_purchase(text) from public, anon, authenticated;
revoke all on function snowvill_transfer(uuid[], uuid) from public, anon, authenticated;

grant execute on function snowvill_wallet(uuid) to anon;
grant execute on function snowvill_upgrade_village(uuid, text) to anon;
grant execute on function snowvill_get_village(text) to anon;
grant execute on function snowvill_claim_house(uuid, text, int, text, text, text) to anon;
grant execute on function snowvill_credit_purchase(uuid, text, text, numeric, numeric, text, text, text) to service_role;
grant execute on function snowvill_refund_purchase(text) to service_role;
grant execute on function snowvill_transfer(uuid[], uuid) to service_role;
