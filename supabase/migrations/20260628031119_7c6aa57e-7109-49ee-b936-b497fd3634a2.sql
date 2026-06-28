CREATE POLICY "reports_responder_delete" ON public.citizen_reports
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'authority'::app_role)
  OR has_role(auth.uid(), 'ngo'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);