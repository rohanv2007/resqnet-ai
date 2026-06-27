
CREATE POLICY "citizen_reports_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'citizen-reports');
CREATE POLICY "citizen_reports_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'citizen-reports');
