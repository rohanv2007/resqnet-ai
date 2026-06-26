
-- =========================================================
-- ResQNet schema
-- =========================================================

-- Enable PostGIS-lite via standard geography functions (point types via lat/lng floats; PostGIS not required for MVP)

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('citizen', 'authority', 'ngo', 'admin');
CREATE TYPE public.alert_language AS ENUM ('english','hindi','malayalam','tamil','telugu','kannada','bengali','marathi','gujarati','odia','punjabi');
CREATE TYPE public.risk_level AS ENUM ('low','watch','warning','danger');
CREATE TYPE public.disaster_type AS ENUM ('flood','cyclone','wildfire','urban_fire','earthquake','rainfall','landslide');
CREATE TYPE public.alert_status AS ENUM ('draft','pending_approval','approved','sent','cancelled','failed');
CREATE TYPE public.report_status AS ENUM ('new','verified','duplicate','rejected','resolved');
CREATE TYPE public.report_type AS ENUM ('rising_water','blocked_road','fire','damaged_bridge','shelter_overcrowding','power_failure','medical_help','trapped_people','other');

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  language public.alert_language NOT NULL DEFAULT 'english',
  state TEXT,
  district TEXT,
  organization TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ---------- user_roles ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Auto-create profile + default citizen role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- locations ----------
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ward',
  state TEXT,
  district TEXT,
  population INTEGER DEFAULT 0,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations_public_read" ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations_authority_write" ON public.locations FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'admin'));

-- ---------- shelters ----------
CREATE TABLE public.shelters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  occupancy INTEGER NOT NULL DEFAULT 0,
  contact TEXT,
  facilities JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  district TEXT,
  state TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shelters TO anon, authenticated;
GRANT INSERT, UPDATE ON public.shelters TO authenticated;
GRANT ALL ON public.shelters TO service_role;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shelters_public_read" ON public.shelters FOR SELECT USING (true);
CREATE POLICY "shelters_responder_write" ON public.shelters FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "shelters_responder_update" ON public.shelters FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_shelters_touch BEFORE UPDATE ON public.shelters
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- citizen_reports ----------
CREATE TABLE public.citizen_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.report_type NOT NULL,
  title TEXT,
  description TEXT NOT NULL DEFAULT '',
  severity public.risk_level NOT NULL DEFAULT 'watch',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  image_url TEXT,
  status public.report_status NOT NULL DEFAULT 'new',
  reported_by_name TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.citizen_reports TO anon, authenticated;
GRANT INSERT, UPDATE ON public.citizen_reports TO authenticated;
GRANT ALL ON public.citizen_reports TO service_role;
ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_public_read" ON public.citizen_reports FOR SELECT USING (true);
CREATE POLICY "reports_insert_authed" ON public.citizen_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "reports_responder_update" ON public.citizen_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);
CREATE TRIGGER trg_reports_touch BEFORE UPDATE ON public.citizen_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- alerts ----------
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  language public.alert_language NOT NULL DEFAULT 'english',
  disaster public.disaster_type NOT NULL DEFAULT 'flood',
  severity public.risk_level NOT NULL DEFAULT 'warning',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 5,
  location_name TEXT,
  channels TEXT[] NOT NULL DEFAULT ARRAY['push']::TEXT[],
  status public.alert_status NOT NULL DEFAULT 'draft',
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  expected_impact_at TIMESTAMPTZ,
  shelter_id UUID REFERENCES public.shelters(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_public_read" ON public.alerts FOR SELECT USING (status IN ('sent','approved'));
CREATE POLICY "alerts_responder_read" ON public.alerts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "alerts_responder_insert" ON public.alerts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "alerts_responder_update" ON public.alerts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'admin'));

-- ---------- alert_deliveries ----------
CREATE TABLE public.alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alert_deliveries TO authenticated;
GRANT ALL ON public.alert_deliveries TO service_role;
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_responder_read" ON public.alert_deliveries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));

-- ---------- weather_snapshots (cache from Open-Meteo) ----------
CREATE TABLE public.weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  temperature DOUBLE PRECISION,
  rainfall_mm DOUBLE PRECISION,
  wind_speed_kmh DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  pressure DOUBLE PRECISION,
  forecast_time TIMESTAMPTZ,
  raw JSONB,
  source TEXT NOT NULL DEFAULT 'open-meteo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.weather_snapshots TO anon, authenticated;
GRANT ALL ON public.weather_snapshots TO service_role;
ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weather_public_read" ON public.weather_snapshots FOR SELECT USING (true);

-- ---------- fire_hotspots (NASA FIRMS) ----------
CREATE TABLE public.fire_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  brightness DOUBLE PRECISION,
  confidence INTEGER,
  acq_datetime TIMESTAMPTZ,
  satellite TEXT,
  frp DOUBLE PRECISION,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fire_hotspots TO anon, authenticated;
GRANT ALL ON public.fire_hotspots TO service_role;
ALTER TABLE public.fire_hotspots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fire_public_read" ON public.fire_hotspots FOR SELECT USING (true);

-- ---------- risk_scores ----------
CREATE TABLE public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  disaster public.disaster_type NOT NULL,
  score INTEGER NOT NULL,
  level public.risk_level NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 70,
  trend TEXT DEFAULT 'stable',
  top_factors JSONB DEFAULT '[]'::jsonb,
  recommended_action TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.risk_scores TO anon, authenticated;
GRANT ALL ON public.risk_scores TO service_role;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk_public_read" ON public.risk_scores FOR SELECT USING (true);

-- ---------- simulation_runs ----------
CREATE TABLE public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster public.disaster_type NOT NULL,
  scenario_name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  affected_population INTEGER DEFAULT 0,
  roads_blocked INTEGER DEFAULT 0,
  shelters_at_risk INTEGER DEFAULT 0,
  confidence INTEGER DEFAULT 70,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.simulation_runs TO authenticated;
GRANT INSERT ON public.simulation_runs TO authenticated;
GRANT ALL ON public.simulation_runs TO service_role;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sim_read_authed" ON public.simulation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sim_insert_responder" ON public.simulation_runs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));

-- ---------- resources ----------
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'available',
  capacity INTEGER,
  current_load INTEGER,
  contact TEXT,
  assigned_alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_public_read" ON public.resources FOR SELECT USING (true);
CREATE POLICY "resources_responder_write" ON public.resources FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "resources_responder_update" ON public.resources FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_resources_touch BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- evacuation_routes (cached OSRM) ----------
CREATE TABLE public.evacuation_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  shelter_id UUID REFERENCES public.shelters(id) ON DELETE CASCADE,
  distance_km DOUBLE PRECISION,
  duration_min DOUBLE PRECISION,
  safety_score INTEGER,
  geometry JSONB,
  warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.evacuation_routes TO anon, authenticated;
GRANT ALL ON public.evacuation_routes TO service_role;
ALTER TABLE public.evacuation_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_public_read" ON public.evacuation_routes FOR SELECT USING (true);

-- ---------- road_status (passability overrides) ----------
CREATE TABLE public.road_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.road_status TO anon, authenticated;
GRANT INSERT, UPDATE ON public.road_status TO authenticated;
GRANT ALL ON public.road_status TO service_role;
ALTER TABLE public.road_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roads_public_read" ON public.road_status FOR SELECT USING (true);
CREATE POLICY "roads_responder_write" ON public.road_status FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'authority') OR public.has_role(auth.uid(),'ngo') OR public.has_role(auth.uid(),'admin') OR auth.uid() IS NOT NULL);

-- Seed a handful of real Indian locations so the dashboard shows real geography
INSERT INTO public.locations (name, type, state, district, population, lat, lng) VALUES
('Aluva', 'ward', 'Kerala', 'Ernakulam', 28000, 10.1004, 76.3570),
('Periyar Nagar', 'ward', 'Kerala', 'Ernakulam', 14000, 10.1124, 76.3489),
('Edapally', 'ward', 'Kerala', 'Ernakulam', 35000, 10.0261, 76.3082),
('T. Nagar', 'ward', 'Tamil Nadu', 'Chennai', 80000, 13.0418, 80.2341),
('Tambaram', 'ward', 'Tamil Nadu', 'Chennai', 55000, 12.9249, 80.1000),
('Puri', 'district', 'Odisha', 'Puri', 200000, 19.8135, 85.8312),
('Kuttanad', 'block', 'Kerala', 'Alappuzha', 175000, 9.5333, 76.4167),
('Majuli', 'block', 'Assam', 'Majuli', 167000, 26.9500, 94.1700),
('Joshimath', 'town', 'Uttarakhand', 'Chamoli', 17000, 30.5667, 79.5667);

INSERT INTO public.shelters (name, type, lat, lng, capacity, occupancy, contact, facilities, status, district, state) VALUES
('Aluva Municipal School Relief Camp','school',10.1065,76.3500,800,420,'+91 484 262 3456','["Medical desk","Drinking water","Generator"]','open','Ernakulam','Kerala'),
('UC College Auditorium','school',10.0949,76.3487,1200,940,'+91 484 260 9191','["Kitchen","Ambulance access"]','open','Ernakulam','Kerala'),
('Periyar Community Hall','community_hall',10.1150,76.3660,300,294,'+91 484 260 8820','["First aid","Water"]','full','Ernakulam','Kerala'),
('Puri Government Higher Secondary','school',19.8090,85.8290,1500,0,'+91 6752 222 333','["Generator","Kitchen"]','open','Puri','Odisha'),
('Majuli Cyclone Shelter','government_building',26.9520,94.1680,500,0,'+91 3775 274 100','["Boats","Medical"]','open','Majuli','Assam');
