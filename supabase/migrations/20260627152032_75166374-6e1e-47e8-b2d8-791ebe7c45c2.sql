
ALTER TABLE public.telegram_subscribers
  ADD COLUMN IF NOT EXISTS last_auto_alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_auto_alert_level text,
  ADD COLUMN IF NOT EXISTS last_auto_alert_key text;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- remove previous if any
DO $$ BEGIN
  PERFORM cron.unschedule('resqnet-auto-alert-sweep');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'resqnet-auto-alert-sweep',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--bbqqhyszvuuxnfoejvmo.lovable.app/api/public/hooks/auto-alerts',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Qm4hody5tmkLSsj2H0kiFw_gsSSdIqJ"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
