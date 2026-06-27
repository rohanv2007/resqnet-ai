
DROP POLICY IF EXISTS reports_authenticated_read ON public.citizen_reports;
CREATE POLICY reports_responder_or_owner_read ON public.citizen_reports
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'authority'::app_role)
    OR has_role(auth.uid(), 'ngo'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS resources_authenticated_read ON public.resources;
CREATE POLICY resources_responder_read ON public.resources
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'authority'::app_role)
    OR has_role(auth.uid(), 'ngo'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
