
ALTER TABLE public.leadership
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'leadership',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.elders
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'senior',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_leadership_updated_at ON public.leadership;
CREATE TRIGGER update_leadership_updated_at BEFORE UPDATE ON public.leadership
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_elders_updated_at ON public.elders;
CREATE TRIGGER update_elders_updated_at BEFORE UPDATE ON public.elders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS leadership_order_idx ON public.leadership (display_order, id);
CREATE INDEX IF NOT EXISTS elders_order_idx ON public.elders (display_order, id);
