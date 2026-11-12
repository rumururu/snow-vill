-- Report handling (owner decision 2026-11-12, needed by the published child safety standards
-- https://snow.mkideabox.com/child-safety/): every report is reviewed and either the house is removed or the
-- report is dismissed. The operator works through supabase/moderation.py (Management API, never the app).
--
-- snowvill_reports.status: 'open' (new) | 'dismissed' (reviewed, no violation). A removed house takes its
--   reports with it (on delete cascade, as before — user deletion also clears them, as the privacy policy says);
--   the removal itself is recorded in snowvill_moderation_log.
-- snowvill_reports.notified_at: when the alert mail went out (moderation.py check, every 15 minutes).
-- snowvill_moderation_log: what was decided, about which house/village, when and why. It never stores the
--   house's content (nickname, message, photo).

alter table snowvill_reports add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed'));
alter table snowvill_reports add column if not exists notified_at timestamptz;
alter table snowvill_reports add column if not exists handled_at timestamptz;
create index if not exists snowvill_reports_open on snowvill_reports (house_id) where status = 'open';

create table if not exists snowvill_moderation_log (
  id bigint generated always as identity primary key,
  house_id uuid not null,
  village_id text not null,
  action text not null check (action in ('removed', 'dismissed')),
  reports int not null,
  note text not null default '' check (char_length(note) <= 500),
  at timestamptz not null default now()
);
alter table snowvill_moderation_log enable row level security;
revoke all on table snowvill_moderation_log from public, anon, authenticated;

-- Open reports grouped by house, oldest first: what the operator needs to decide (no secrets, no photo path).
create or replace function snowvill_mod_queue()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(q order by q.first_at), '[]'::json) from (
    select h.id as house_id, v.id as village_id, v.name as village, h.nickname, h.message,
           h.photo_path is not null as has_photo, count(*) as reports, count(distinct r.reporter) as reporters,
           array_agg(r.reason order by r.created_at) as reasons, array_agg(r.id order by r.created_at) as report_ids,
           min(r.created_at) as first_at, max(r.created_at) as last_at,
           count(*) filter (where r.notified_at is null) as unnotified
    from snowvill_reports r join snowvill_houses h on h.id = r.house_id join snowvill_villages v on v.id = h.village_id
    where r.status = 'open'
    group by h.id, v.id
  ) q
$$;

create or replace function snowvill_mod_mark_notified(p_report_ids bigint[])
returns int language sql security definer set search_path = public as $$
  with u as (update snowvill_reports set notified_at = now()
             where id = any(p_report_ids) and notified_at is null returning 1)
  select count(*)::int from u
$$;

-- No violation: close the house's open reports and log it.
create or replace function snowvill_mod_dismiss(p_house_id uuid, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_village text;
  v_n int;
begin
  select village_id into v_village from snowvill_houses where id = p_house_id;
  if v_village is null then
    raise exception 'house not found' using errcode = 'P0002';
  end if;
  update snowvill_reports set status = 'dismissed', handled_at = now() where house_id = p_house_id and status = 'open';
  get diagnostics v_n = row_count;
  insert into snowvill_moderation_log (house_id, village_id, action, reports, note)
    values (p_house_id, v_village, 'dismissed', v_n, left(coalesce(p_note, ''), 500));
  return v_n;
end $$;

-- Violation: log, then delete the house (its reports cascade). Returns the photo path for the caller to delete
-- from storage (same contract as snowvill_delete_house).
create or replace function snowvill_mod_remove(p_house_id uuid, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_village text;
  v_n int;
  v_path text;
begin
  select village_id into v_village from snowvill_houses where id = p_house_id for update;
  if v_village is null then
    raise exception 'house not found' using errcode = 'P0002';
  end if;
  select count(*) into v_n from snowvill_reports where house_id = p_house_id and status = 'open';
  insert into snowvill_moderation_log (house_id, village_id, action, reports, note)
    values (p_house_id, v_village, 'removed', v_n, left(coalesce(p_note, ''), 500));
  delete from snowvill_houses where id = p_house_id returning photo_path into v_path;
  return v_path;
end $$;

revoke all on function snowvill_mod_queue() from public, anon, authenticated;
revoke all on function snowvill_mod_mark_notified(bigint[]) from public, anon, authenticated;
revoke all on function snowvill_mod_dismiss(uuid, text) from public, anon, authenticated;
revoke all on function snowvill_mod_remove(uuid, text) from public, anon, authenticated;
grant execute on function snowvill_mod_queue() to service_role;
grant execute on function snowvill_mod_mark_notified(bigint[]) to service_role;
grant execute on function snowvill_mod_dismiss(uuid, text) to service_role;
grant execute on function snowvill_mod_remove(uuid, text) to service_role;
revoke all on sequence snowvill_moderation_log_id_seq from public, anon, authenticated;
