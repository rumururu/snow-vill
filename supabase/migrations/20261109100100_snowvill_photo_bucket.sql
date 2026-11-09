-- Private photo bucket for Snow Village. No storage.objects policies are added, so anon/authenticated
-- cannot read, list or write; only the snowvill-photo Edge Function (service role) touches it and
-- hands out short-lived signed URLs after checking the house exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snowvill-photos', 'snowvill-photos', false, 307200, array['image/jpeg'])
on conflict (id) do nothing;
