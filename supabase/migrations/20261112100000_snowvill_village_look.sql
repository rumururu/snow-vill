-- Village look (owner decision 2026-11-11): the village owner picks one path style for the whole village
-- and may drag decorations (plaza lamps/bench, district lamps, benches, signposts, bushes, snowman
-- lanterns) to new spots. Only the owner (owner secret) may change it.
--
-- villages.path_style: 'dirt' (default) | 'stones' | 'brick' | 'snow'
-- villages.decor: { "<decor id>": [i, j], … } — moved decorations only (ground tiles). Ids are the
--   renderer's: plaza-lamp-a, plaza-lamp-b, plaza-bench, d<district>-decor<k>. Placement rules (not on a
--   house, path or landmark, inside the village) are checked by the clients; the server only bounds the shape.

alter table snowvill_villages add column if not exists path_style text not null default 'dirt'
  check (path_style in ('dirt', 'stones', 'brick', 'snow'));
alter table snowvill_villages add column if not exists decor jsonb not null default '{}'::jsonb;

create or replace function snowvill_valid_decor(p jsonb)
returns boolean language sql immutable set search_path = public as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 120
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key !~ '^(plaza-(lamp-a|lamp-b|bench)|d[0-9]-decor[0-9]{1,2})$'
         or jsonb_typeof(e.value) <> 'array'
         or jsonb_array_length(e.value) <> 2
         or jsonb_typeof(e.value -> 0) <> 'number'
         or jsonb_typeof(e.value -> 1) <> 'number'
         or abs((e.value ->> 0)::numeric) > 40
         or abs((e.value ->> 1)::numeric) > 40)
$$;

create or replace function snowvill_get_village(p_village_id text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', v.id, 'name', v.name, 'created_at', v.created_at, 'capacity', v.capacity,
    'open_halves', v.open_halves, 'path_style', v.path_style, 'decor', v.decor,
    'houses', coalesce((select json_agg(snowvill_house_json(h) order by h.slot)
                        from snowvill_houses h where h.village_id = v.id), '[]'::json))
  from snowvill_villages v where v.id = p_village_id
$$;

-- Owner only: set the path style and the moved decorations (the whole map replaces the old one).
create or replace function snowvill_set_village_look(
  p_install_id uuid, p_village_id text, p_owner_secret text, p_path_style text, p_decor jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash bytea;
begin
  if p_path_style is null or p_path_style not in ('dirt', 'stones', 'brick', 'snow')
     or p_decor is null or not snowvill_valid_decor(p_decor)
     or p_owner_secret is null or char_length(p_owner_secret) > 100 then
    raise exception 'invalid look input' using errcode = '22023';
  end if;
  perform snowvill_rate_limit(p_install_id, 'look', 10, 200);
  select owner_hash into v_hash from snowvill_villages where id = p_village_id for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if v_hash <> snowvill_hash(p_owner_secret) then
    return json_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;
  update snowvill_villages set path_style = p_path_style, decor = p_decor where id = p_village_id;
  return json_build_object('ok', true, 'path_style', p_path_style, 'decor', p_decor);
end $$;

revoke all on function snowvill_valid_decor(jsonb) from public, anon, authenticated, service_role;
revoke all on function snowvill_get_village(text) from public, anon, authenticated;
revoke all on function snowvill_set_village_look(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function snowvill_get_village(text) to anon;
grant execute on function snowvill_set_village_look(uuid, text, text, text, jsonb) to anon;
