
-- Remove public read on citizen-reports storage bucket; app uses signed URLs (1-year) created server-side via service role.
DROP POLICY IF EXISTS "citizen_reports_public_read" ON storage.objects;

-- Tighten upload policy: only authenticated users can upload, and only into a path prefixed by their auth.uid().
DROP POLICY IF EXISTS "citizen_reports_auth_upload" ON storage.objects;
CREATE POLICY "citizen_reports_auth_upload_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'citizen-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own uploaded objects (admins/responders use service-role + signed URLs).
CREATE POLICY "citizen_reports_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'citizen-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Shelters: drop fully-public SELECT, require authentication for the table.
DROP POLICY IF EXISTS "shelters_public_read" ON public.shelters;
CREATE POLICY "shelters_authenticated_read" ON public.shelters
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT ON public.shelters FROM anon;
