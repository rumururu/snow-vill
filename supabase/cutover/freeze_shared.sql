-- Cutover (docs/12): run ONCE on the shared project after the final data copy, when web + app 1.1 talk to the
-- dedicated project. App 1.0 can still read villages; every write is refused (it shows its generic error).
-- Undo: grant execute on the same functions to anon.
revoke execute on function snowvill_create_village(uuid, text) from anon, public;
revoke execute on function snowvill_claim_house(uuid, text, integer, text, text, text) from anon, public;
revoke execute on function snowvill_claim_house(uuid, text, integer, text, text, text, integer) from anon, public;
revoke execute on function snowvill_report(uuid, uuid, text) from anon, public;
revoke execute on function snowvill_set_village_look(uuid, text, text, text, jsonb) from anon, public;
revoke execute on function snowvill_upgrade_village(uuid, text) from anon, public;
revoke execute on function snowvill_upgrade_village(uuid, text, integer) from anon, public;
select p.oid::regprocedure as still_callable_by_anon from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'snowvill\_%' and has_function_privilege('anon', p.oid, 'execute');
