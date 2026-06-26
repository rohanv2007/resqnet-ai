
CREATE TABLE public.telegram_subscribers (
  chat_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  language TEXT DEFAULT 'english',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_subscribers TO service_role;
ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;
-- No public policies; only service_role (server functions) touches this.
