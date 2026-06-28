DROP POLICY IF EXISTS sim_read_authed ON public.simulation_runs;
CREATE POLICY sim_read_responders ON public.simulation_runs FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'authority'::app_role) OR has_role(auth.uid(), 'ngo'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);