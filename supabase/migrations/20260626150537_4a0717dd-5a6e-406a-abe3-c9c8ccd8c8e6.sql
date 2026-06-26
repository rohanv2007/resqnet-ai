
-- 1. road_status: remove the OR (auth.uid() IS NOT NULL) loophole
DROP POLICY IF EXISTS roads_responder_write ON public.road_status;
CREATE POLICY roads_responder_write ON public.road_status
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'authority'::public.app_role)
    OR public.has_role(auth.uid(), 'ngo'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. citizen_reports: restrict reads to signed-in users (hides reporter names from anon)
DROP POLICY IF EXISTS reports_public_read ON public.citizen_reports;
CREATE POLICY reports_authenticated_read ON public.citizen_reports
  FOR SELECT TO authenticated USING (true);

-- 3. resources: restrict reads to signed-in users (hides contact details from anon)
DROP POLICY IF EXISTS resources_public_read ON public.resources;
CREATE POLICY resources_authenticated_read ON public.resources
  FOR SELECT TO authenticated USING (true);
