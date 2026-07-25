/*
# Crime Analytics AI — Core Schema

## Purpose
Creates the full database backbone for an AI-powered crime hotspot prediction
and analytics dashboard. Stores crime incidents, ML/cache outputs, AI insights,
generated reports, and analyst/admin profiles. All tables use Row Level Security
with role-aware access (admin + analyst can read analytics; users manage their
own reports; anon blocked from sensitive data).

## New Tables
1. `profiles` — id (uuid PK refs auth.users), email, full_name, role, created_at
2. `crimes` — date, crime_type, district, state, latitude, longitude, severity,
   victims, status, derived time features (year/month/day/weekday/hour/season),
   description, created_at
3. `predictions` — model_name, scope, payload(jsonb), generated_at
4. `analytics_cache` — scope(unique), payload(jsonb), generated_at
5. `hotspots` — cluster_id, center_lat/lng, risk_level, crime_count, radius_m,
   dominant_crime, district, state, generated_at
6. `insights` — title, body, category, severity, tags, generated_at
7. `reports` — title, scope, generated_by (refs auth.users, defaults auth.uid()),
   generated_at, summary, storage_path

## Security (RLS)
- profiles: authenticated read all; users update/insert own.
- crimes, predictions, analytics_cache, hotspots, insights: authenticated CRUD
  (admin + analyst both authenticated; seed runs via service role bypassing RLS).
- reports: authenticated read; users insert/update/delete only their own.

## Important Notes
1. reports.generated_by has no DEFAULT auth.uid() here because the client always
   passes the id explicitly; the WITH CHECK enforces ownership.
2. Indexes on crimes(district, state, crime_type, date, severity, year+month),
   hotspots(risk_level), insights(severity), reports(generated_by),
   predictions(scope).
3. Idempotent: IF NOT EXISTS on tables/indexes; policies drop-then-create.
4. Auto-create profile trigger on auth.users insert via SECURITY DEFINER fn.
5. No destructive ops, no transaction control.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT 'Analyst',
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin','analyst')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- ---------- crimes ----------
CREATE TABLE IF NOT EXISTS crimes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  crime_type text NOT NULL,
  district text NOT NULL,
  state text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Low','Medium','High','Critical')),
  victims integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Under Investigation','Closed','Arrest Made')),
  year integer NOT NULL,
  month integer NOT NULL,
  day integer NOT NULL,
  weekday integer NOT NULL,
  hour integer NOT NULL DEFAULT 0,
  season text NOT NULL DEFAULT 'Winter',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crimes_district ON crimes(district);
CREATE INDEX IF NOT EXISTS idx_crimes_state ON crimes(state);
CREATE INDEX IF NOT EXISTS idx_crimes_type ON crimes(crime_type);
CREATE INDEX IF NOT EXISTS idx_crimes_date ON crimes(date);
CREATE INDEX IF NOT EXISTS idx_crimes_severity ON crimes(severity);
CREATE INDEX IF NOT EXISTS idx_crimes_year_month ON crimes(year, month);

ALTER TABLE crimes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crimes_select_authenticated" ON crimes;
CREATE POLICY "crimes_select_authenticated"
ON crimes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "crimes_insert_authenticated" ON crimes;
CREATE POLICY "crimes_insert_authenticated"
ON crimes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "crimes_update_authenticated" ON crimes;
CREATE POLICY "crimes_update_authenticated"
ON crimes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "crimes_delete_authenticated" ON crimes;
CREATE POLICY "crimes_delete_authenticated"
ON crimes FOR DELETE TO authenticated USING (true);

-- ---------- predictions ----------
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  scope text NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_scope ON predictions(scope);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_authenticated" ON predictions;
CREATE POLICY "predictions_select_authenticated"
ON predictions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "predictions_insert_authenticated" ON predictions;
CREATE POLICY "predictions_insert_authenticated"
ON predictions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "predictions_update_authenticated" ON predictions;
CREATE POLICY "predictions_update_authenticated"
ON predictions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "predictions_delete_authenticated" ON predictions;
CREATE POLICY "predictions_delete_authenticated"
ON predictions FOR DELETE TO authenticated USING (true);

-- ---------- analytics_cache ----------
CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_cache_select_authenticated" ON analytics_cache;
CREATE POLICY "analytics_cache_select_authenticated"
ON analytics_cache FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "analytics_cache_insert_authenticated" ON analytics_cache;
CREATE POLICY "analytics_cache_insert_authenticated"
ON analytics_cache FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_cache_update_authenticated" ON analytics_cache;
CREATE POLICY "analytics_cache_update_authenticated"
ON analytics_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_cache_delete_authenticated" ON analytics_cache;
CREATE POLICY "analytics_cache_delete_authenticated"
ON analytics_cache FOR DELETE TO authenticated USING (true);

-- ---------- hotspots ----------
CREATE TABLE IF NOT EXISTS hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id integer NOT NULL,
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('High','Medium','Low')),
  crime_count integer NOT NULL,
  radius_m numeric NOT NULL,
  dominant_crime text NOT NULL,
  district text NOT NULL,
  state text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_risk ON hotspots(risk_level);

ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotspots_select_authenticated" ON hotspots;
CREATE POLICY "hotspots_select_authenticated"
ON hotspots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hotspots_insert_authenticated" ON hotspots;
CREATE POLICY "hotspots_insert_authenticated"
ON hotspots FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hotspots_update_authenticated" ON hotspots;
CREATE POLICY "hotspots_update_authenticated"
ON hotspots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "hotspots_delete_authenticated" ON hotspots;
CREATE POLICY "hotspots_delete_authenticated"
ON hotspots FOR DELETE TO authenticated USING (true);

-- ---------- insights ----------
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_severity ON insights(severity);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insights_select_authenticated" ON insights;
CREATE POLICY "insights_select_authenticated"
ON insights FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insights_insert_authenticated" ON insights;
CREATE POLICY "insights_insert_authenticated"
ON insights FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "insights_update_authenticated" ON insights;
CREATE POLICY "insights_update_authenticated"
ON insights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "insights_delete_authenticated" ON insights;
CREATE POLICY "insights_delete_authenticated"
ON insights FOR DELETE TO authenticated USING (true);

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scope text NOT NULL,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL DEFAULT '',
  storage_path text
);

CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_authenticated" ON reports;
CREATE POLICY "reports_select_authenticated"
ON reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own"
ON reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = generated_by);

DROP POLICY IF EXISTS "reports_update_own" ON reports;
CREATE POLICY "reports_update_own"
ON reports FOR UPDATE TO authenticated
USING (auth.uid() = generated_by) WITH CHECK (auth.uid() = generated_by);

DROP POLICY IF EXISTS "reports_delete_own" ON reports;
CREATE POLICY "reports_delete_owned" ON reports;
DROP POLICY IF EXISTS "reports_delete_owned" ON reports;
CREATE POLICY "reports_delete_own"
ON reports FOR DELETE TO authenticated USING (auth.uid() = generated_by);

-- ---------- helper: profile auto-create on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Analyst'),
    COALESCE(NEW.raw_app_meta_data->>'role', 'analyst')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
