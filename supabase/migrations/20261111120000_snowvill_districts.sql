-- Districts (owner decision 2026-11-11): the village is the cathedral plaza plus up to 10 districts
-- ("동네") of 6 lots each, laid out around the plaza. Lots of district d are slots d*6 … d*6+5; each
-- district opens in two halves of 3 (slots d*6+0..2, then d*6+3..5). The free village is district 0
-- (both halves). Each paid step opens the next half of a district the buyer chooses.
--
-- villages.open_halves: bitmask of opened halves (bit 2d = first half of district d, bit 2d+1 = second).
-- capacity stays = 3 × popcount(open_halves) so prices (snowvill_step_tier) and VILLAGE_FULL keep working.

alter table snowvill_villages add column if not exists open_halves int not null default 3
  check (open_halves >= 0 and open_halves < (1 << 20));

-- Existing villages: open halves in district order up to their capacity.
update snowvill_villages set open_halves = ((1 << (capacity / 3)) - 1) where open_halves = 3 and capacity > 6;

create or replace function snowvill_popcount(p int)
returns int language sql immutable set search_path = public as $$
  select length(replace((p::bit(20))::text, '0', ''))
$$;

-- Is this slot inside an opened half?
create or replace function snowvill_slot_open(p_open int, p_slot int)
returns boolean language sql immutable set search_path = public as $$
  select p_slot between 0 and 59 and (p_open >> (p_slot / 3)) & 1 = 1
$$;

create or replace function snowvill_get_village(p_village_id text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', v.id, 'name', v.name, 'created_at', v.created_at, 'capacity', v.capacity,
    'open_halves', v.open_halves,
    'houses', coalesce((select json_agg(snowvill_house_json(h) order by h.slot)
                        from snowvill_houses h where h.village_id = v.id), '[]'::json))
  from snowvill_villages v where v.id = p_village_id
$$;

-- Open the next half of district p_district (0..9). Spends one credit of the tier the village needs.
create or replace function snowvill_upgrade_village(p_install_id uuid, p_village_id text, p_district int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_open int;
  v_capacity smallint;
  v_tier smallint;
  v_credits int;
  v_bit int;
begin
  if p_district is null or p_district not between 0 and 9 then
    raise exception 'invalid district' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'upgrade', 10, 50);
  select open_halves, capacity into v_open, v_capacity from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  v_tier := snowvill_step_tier(v_capacity);
  if v_tier = 0 then
    return json_build_object('ok', false, 'reason', 'MAX_SIZE', 'capacity', v_capacity);
  end if;
  v_bit := case when (v_open >> (2 * p_district)) & 1 = 0 then 2 * p_district
                when (v_open >> (2 * p_district + 1)) & 1 = 0 then 2 * p_district + 1
                else -1 end;
  if v_bit < 0 then
    return json_build_object('ok', false, 'reason', 'DISTRICT_OPEN', 'district', p_district);
  end if;
  select credits into v_credits from snowvill_tier_credits where install_id = p_install_id and tier = v_tier for update;
  if coalesce(v_credits, 0) < 1 then
    return json_build_object('ok', false, 'reason', 'NO_CREDIT', 'tier', v_tier, 'capacity', v_capacity);
  end if;
  v_open := v_open | (1 << v_bit);
  update snowvill_tier_credits set credits = credits - 1, updated_at = now() where install_id = p_install_id and tier = v_tier;
  update snowvill_villages set open_halves = v_open, capacity = 3 * snowvill_popcount(v_open) where id = p_village_id;
  insert into snowvill_upgrades (village_id, upgraded_by, tier, capacity_after)
    values (p_village_id, p_install_id, v_tier, 3 * snowvill_popcount(v_open));
  return json_build_object('ok', true, 'capacity', 3 * snowvill_popcount(v_open), 'open_halves', v_open,
                           'district', p_district, 'tier', v_tier,
                           'next_tier', snowvill_step_tier((3 * snowvill_popcount(v_open))::smallint), 'credits', v_credits - 1);
end $$;

-- Old 2-argument call (installed builds): opens the first district that still has a closed half.
create or replace function snowvill_upgrade_village(p_install_id uuid, p_village_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_open int;
  d int;
begin
  select open_halves into v_open from snowvill_villages where id = p_village_id;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  for d in 0..9 loop
    if ((v_open >> (2 * d)) & 3) <> 3 then
      return snowvill_upgrade_village(p_install_id, p_village_id, d);
    end if;
  end loop;
  perform snowvill_rate_limit(p_install_id, 'upgrade', 10, 50);
  return json_build_object('ok', false, 'reason', 'MAX_SIZE');
end $$;

-- Claims must land in an opened half.
create or replace function snowvill_claim_house(
  p_install_id uuid, p_village_id text, p_slot int, p_nickname text, p_style text, p_message text, p_direction int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_nick text := snowvill_clean_text(p_nickname, false);
  v_msg text := snowvill_clean_text(p_message, true);
  v_secret text;
  v_house snowvill_houses;
  v_capacity smallint;
  v_open int;
begin
  if p_slot is null or p_slot not between 0 and 59
     or char_length(v_nick) not between 1 and 10
     or p_style is null or not snowvill_valid_style(p_style)
     or p_direction is null or p_direction not between 0 and 3
     or char_length(v_msg) > 60 then
    raise exception 'invalid house input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'claim', 6, 60);

  select capacity, open_halves into v_capacity, v_open from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if not snowvill_slot_open(v_open, p_slot) then
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

revoke all on function snowvill_popcount(int) from public, anon, authenticated, service_role;
revoke all on function snowvill_slot_open(int, int) from public, anon, authenticated, service_role;
revoke all on function snowvill_get_village(text) from public, anon, authenticated;
revoke all on function snowvill_upgrade_village(uuid, text, int) from public, anon, authenticated;
revoke all on function snowvill_upgrade_village(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_claim_house(uuid, text, int, text, text, text, int) from public, anon, authenticated;
grant execute on function snowvill_get_village(text) to anon;
grant execute on function snowvill_upgrade_village(uuid, text, int) to anon;
grant execute on function snowvill_upgrade_village(uuid, text) to anon;
grant execute on function snowvill_claim_house(uuid, text, int, text, text, text, int) to anon;
