-- Daily purge of rate-limit rows older than one day, so the privacy policy's "deleted after one day"
-- holds even when no new requests arrive (the in-function purge only runs on traffic).
select cron.schedule(
  'snowvill_calls_purge',
  '23 3 * * *',
  $$delete from public.snowvill_calls where at < now() - interval '1 day'$$
);
