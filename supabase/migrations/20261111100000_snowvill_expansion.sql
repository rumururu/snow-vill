-- Snow Village expansion (owner decision 2026-11-10, docs/11-village-expansion-plan.md):
-- free villages hold 6 houses; each paid step adds 3, up to 60.
--   6→9  tier 1  snowvillage_big_village  ₩2,900 (product kept from the first release)
--   9→12 tier 2  snowvillage_expand_2     ₩6,900
--   12→15 tier 3 snowvillage_expand_3     ₩12,900
--   15→…→60 tier 4 snowvillage_expand_4   ₩25,800 per step
-- Credits are kept per tier; a step spends one credit of the tier the village currently needs.
-- Houses get a door direction (0..3) chosen by the friend, lots 0..59 and more house types.

-- ---------- villages: capacity 6, 9, …, 60 ----------
alter table snowvill_villages drop constraint if exists snowvill_villages_capacity_check;
update snowvill_villages set capacity = 9 where capacity = 8;
alter table snowvill_villages add constraint snowvill_villages_capacity_check
  check (capacity between 6 and 60 and capacity % 3 = 0);

-- ---------- houses: slot 0..59, direction, house types ----------
alter table snowvill_houses drop constraint if exists snowvill_houses_slot_check;
alter table snowvill_houses add constraint snowvill_houses_slot_check check (slot between 0 and 59);
alter table snowvill_houses drop constraint if exists snowvill_houses_style_check;
alter table snowvill_houses add constraint snowvill_houses_style_check check (style in (
  'wood', 'sage', 'indigo', 'brick', 'bakery', 'tower', 'gingerbread', 'timber', 'aframe', 'windmill', 'greenhouse'));
alter table snowvill_houses add column if not exists direction smallint not null default 0 check (direction between 0 and 3);

create or replace function snowvill_valid_style(p_style text)
returns boolean language sql immutable set search_path = public as $$
  select p_style in ('wood', 'sage', 'indigo', 'brick', 'bakery', 'tower', 'gingerbread', 'timber', 'aframe', 'windmill', 'greenhouse')
$$;

-- ---------- tiers ----------
create or replace function snowvill_product_tier(p_product_id text)
returns smallint language sql immutable set search_path = public as $$
  select case p_product_id
    when 'snowvillage_big_village' then 1
    when 'snowvillage_expand_2' then 2
    when 'snowvillage_expand_3' then 3
    when 'snowvillage_expand_4' then 4
    else 0 end::smallint
$$;

-- The tier a village of this capacity needs for its next step (0 = cannot grow).
create or replace function snowvill_step_tier(p_capacity smallint)
returns smallint language sql immutable set search_path = public as $$
  select case when p_capacity >= 60 then 0 when p_capacity = 6 then 1 when p_capacity = 9 then 2
              when p_capacity = 12 then 3 else 4 end::smallint
$$;

-- Old single-product mapping kept for the webhook signature; every known product is one credit.
create or replace function snowvill_product_credits(p_product_id text)
returns int language sql immutable set search_path = public as $$
  select case when snowvill_product_tier(p_product_id) > 0 then 1 else 0 end
$$;

-- ---------- wallet per tier ----------
create table if not exists snowvill_tier_credits (
  install_id uuid not null,
  tier smallint not null check (tier between 1 and 4),
  credits int not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now(),
  primary key (install_id, tier)
);
alter table snowvill_tier_credits enable row level security;
revoke all on snowvill_tier_credits from public, anon, authenticated;

insert into snowvill_tier_credits (install_id, tier, credits)
  select install_id, 1, credits from snowvill_wallets where credits > 0
  on conflict (install_id, tier) do update set credits = snowvill_tier_credits.credits + excluded.credits;
update snowvill_wallets set credits = 0, updated_at = now() where credits > 0;

alter table snowvill_purchases add column if not exists tier smallint;
update snowvill_purchases set tier = snowvill_product_tier(product_id) where tier is null;

-- ---------- upgrades: one row per step ----------
alter table snowvill_upgrades drop constraint if exists snowvill_upgrades_pkey;
alter table snowvill_upgrades add column if not exists id bigint generated always as identity;
alter table snowvill_upgrades add primary key (id);
alter table snowvill_upgrades add column if not exists tier smallint;
alter table snowvill_upgrades add column if not exists capacity_after smallint;
update snowvill_upgrades set tier = 1, capacity_after = 9 where tier is null;
create index if not exists snowvill_upgrades_village on snowvill_upgrades (village_id);
revoke all on sequence snowvill_upgrades_id_seq from public, anon, authenticated;

-- ---------- app functions (anon) ----------

create or replace function snowvill_wallet(p_install_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'credits', coalesce((select sum(credits) from snowvill_tier_credits where install_id = p_install_id), 0),
    'tiers', json_build_object(
      '1', coalesce((select credits from snowvill_tier_credits where install_id = p_install_id and tier = 1), 0),
      '2', coalesce((select credits from snowvill_tier_credits where install_id = p_install_id and tier = 2), 0),
      '3', coalesce((select credits from snowvill_tier_credits where install_id = p_install_id and tier = 3), 0),
      '4', coalesce((select credits from snowvill_tier_credits where install_id = p_install_id and tier = 4), 0)))
$$;

create or replace function snowvill_upgrade_village(p_install_id uuid, p_village_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_capacity smallint;
  v_tier smallint;
  v_credits int;
  v_after smallint;
begin
  perform snowvill_rate_limit(p_install_id, 'upgrade', 10, 50);
  select capacity into v_capacity from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  v_tier := snowvill_step_tier(v_capacity);
  if v_tier = 0 then
    return json_build_object('ok', false, 'reason', 'MAX_SIZE', 'capacity', v_capacity);
  end if;
  select credits into v_credits from snowvill_tier_credits where install_id = p_install_id and tier = v_tier for update;
  if coalesce(v_credits, 0) < 1 then
    return json_build_object('ok', false, 'reason', 'NO_CREDIT', 'tier', v_tier, 'capacity', v_capacity);
  end if;
  v_after := v_capacity + 3;
  update snowvill_tier_credits set credits = credits - 1, updated_at = now() where install_id = p_install_id and tier = v_tier;
  update snowvill_villages set capacity = v_after where id = p_village_id;
  insert into snowvill_upgrades (village_id, upgraded_by, tier, capacity_after) values (p_village_id, p_install_id, v_tier, v_after);
  return json_build_object('ok', true, 'capacity', v_after, 'tier', v_tier, 'next_tier', snowvill_step_tier(v_after),
                           'credits', v_credits - 1);
end $$;

create or replace function snowvill_house_json(h snowvill_houses)
returns json language sql stable set search_path = public as $$
  select json_build_object('id', h.id, 'slot', h.slot, 'nickname', h.nickname, 'style', h.style,
    'direction', h.direction, 'message', h.message, 'has_photo', h.photo_path is not null, 'created_at', h.created_at)
$$;

-- New claim signature with direction; the old 6-argument one stays (direction 0) for installed builds.
create or replace function snowvill_claim_house(
  p_install_id uuid, p_village_id text, p_slot int, p_nickname text, p_style text, p_message text, p_direction int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_nick text := snowvill_clean_text(p_nickname, false);
  v_msg text := snowvill_clean_text(p_message, true);
  v_secret text;
  v_house snowvill_houses;
  v_capacity smallint;
begin
  if p_slot is null or p_slot not between 0 and 59
     or char_length(v_nick) not between 1 and 10
     or p_style is null or not snowvill_valid_style(p_style)
     or p_direction is null or p_direction not between 0 and 3
     or char_length(v_msg) > 60 then
    raise exception 'invalid house input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'claim', 6, 60);

  select capacity into v_capacity from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if p_slot >= v_capacity then
    return json_build_object('ok', false, 'reason', 'SLOT_LOCKED');
  end if;
  if exists (select 1 from snowvill_houses where village_id = p_village_id and created_by = p_install_id) then
    return json_build_object('ok', false, 'reason', 'ALREADY_JOINED');
  end if;
  if (select count(*) from snowvill_houses where village_id = p_village_id) >= v_capacity then
    return json_build_object('ok', false, 'reason', 'VILLAGE_FULL');
  end if;

  v_secret := snowvill_new_secret();
  insert into snowvill_houses (village_id, slot, nickname, style, message, direction, claim_hash, created_by)
    values (p_village_id, p_slot, v_nick, p_style, v_msg, p_direction::smallint, snowvill_hash(v_secret), p_install_id)
    on conflict (village_id, slot) do nothing
    returning * into v_house;
  if v_house.id is null then
    return json_build_object('ok', false, 'reason', 'SLOT_TAKEN');
  end if;
  return json_build_object('ok', true, 'claim_secret', v_secret, 'house', snowvill_house_json(v_house));
end $$;

create or replace function snowvill_claim_house(
  p_install_id uuid, p_village_id text, p_slot int, p_nickname text, p_style text, p_message text)
returns json language sql security definer set search_path = public as $$
  select snowvill_claim_house(p_install_id, p_village_id, p_slot, p_nickname, p_style, p_message, 0)
$$;

-- ---------- webhook functions (service_role) ----------

create or replace function snowvill_credit_purchase(
  p_install_id uuid, p_transaction_id text, p_product_id text,
  p_price numeric, p_price_usd numeric, p_currency text, p_store text, p_environment text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_tier smallint := snowvill_product_tier(p_product_id);
  v_new boolean;
begin
  if p_install_id is null or coalesce(p_transaction_id, '') = '' then
    raise exception 'invalid purchase' using errcode = '22023';
  end if;
  if v_tier = 0 then
    return json_build_object('credited', 0, 'reason', 'UNKNOWN_PRODUCT');
  end if;
  insert into snowvill_purchases (transaction_id, install_id, product_id, credits, tier, price, price_usd, currency, store, environment)
    values (p_transaction_id, p_install_id, p_product_id, 1, v_tier, p_price, p_price_usd, p_currency, p_store, p_environment)
    on conflict (transaction_id) do nothing
    returning true into v_new;
  if v_new is null then
    return json_build_object('credited', 0, 'reason', 'DUPLICATE');
  end if;
  insert into snowvill_tier_credits (install_id, tier, credits) values (p_install_id, v_tier, 1)
    on conflict (install_id, tier) do update set credits = snowvill_tier_credits.credits + 1, updated_at = now();
  return json_build_object('credited', 1, 'tier', v_tier,
    'credits', (select credits from snowvill_tier_credits where install_id = p_install_id and tier = v_tier));
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
  update snowvill_tier_credits set credits = greatest(credits - p.credits, 0), updated_at = now()
    where install_id = p.install_id and tier = coalesce(p.tier, snowvill_product_tier(p.product_id));
  return json_build_object('refunded', 1, 'tier', p.tier,
    'credits', (select coalesce(credits, 0) from snowvill_tier_credits where install_id = p.install_id and tier = p.tier));
end $$;

create or replace function snowvill_transfer(p_from uuid[], p_to uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_moved int;
begin
  select coalesce(sum(credits), 0) into v_moved from snowvill_tier_credits where install_id = any(p_from) and install_id <> p_to;
  insert into snowvill_tier_credits (install_id, tier, credits)
    select p_to, tier, sum(credits) from snowvill_tier_credits
      where install_id = any(p_from) and install_id <> p_to and credits > 0 group by tier
    on conflict (install_id, tier) do update set credits = snowvill_tier_credits.credits + excluded.credits, updated_at = now();
  update snowvill_tier_credits set credits = 0, updated_at = now() where install_id = any(p_from) and install_id <> p_to;
  update snowvill_purchases set install_id = p_to where install_id = any(p_from) and install_id <> p_to;
  return json_build_object('moved', v_moved);
end $$;

-- ---------- grants ----------
revoke all on function snowvill_valid_style(text) from public, anon, authenticated, service_role;
revoke all on function snowvill_product_tier(text) from public, anon, authenticated, service_role;
revoke all on function snowvill_step_tier(smallint) from public, anon, authenticated, service_role;
revoke all on function snowvill_product_credits(text) from public, anon, authenticated, service_role;
revoke all on function snowvill_wallet(uuid) from public, anon, authenticated;
revoke all on function snowvill_upgrade_village(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_house_json(snowvill_houses) from public, anon, authenticated, service_role;
revoke all on function snowvill_claim_house(uuid, text, int, text, text, text, int) from public, anon, authenticated;
revoke all on function snowvill_claim_house(uuid, text, int, text, text, text) from public, anon, authenticated;
revoke all on function snowvill_credit_purchase(uuid, text, text, numeric, numeric, text, text, text) from public, anon, authenticated;
revoke all on function snowvill_refund_purchase(text) from public, anon, authenticated;
revoke all on function snowvill_transfer(uuid[], uuid) from public, anon, authenticated;

grant execute on function snowvill_wallet(uuid) to anon;
grant execute on function snowvill_upgrade_village(uuid, text) to anon;
grant execute on function snowvill_claim_house(uuid, text, int, text, text, text, int) to anon;
grant execute on function snowvill_claim_house(uuid, text, int, text, text, text) to anon;
grant execute on function snowvill_credit_purchase(uuid, text, text, numeric, numeric, text, text, text) to service_role;
grant execute on function snowvill_refund_purchase(text) to service_role;
grant execute on function snowvill_transfer(uuid[], uuid) to service_role;
