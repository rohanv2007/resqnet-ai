
-- 1. Restrict shelter contact column from authenticated/anon reads.
-- Server-side admin client (service_role) retains access for the dashboard.
REVOKE SELECT (contact) ON public.shelters FROM authenticated;
REVOKE SELECT (contact) ON public.shelters FROM anon;

-- 2. Allow responders to read citizen report images in storage so the
-- image_url they can already see is actually fetchable.
CREATE POLICY "citizen_reports_responder_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'citizen-reports'
  AND (
    has_role(auth.uid(), 'authority'::app_role)
    OR has_role(auth.uid(), 'ngo'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
