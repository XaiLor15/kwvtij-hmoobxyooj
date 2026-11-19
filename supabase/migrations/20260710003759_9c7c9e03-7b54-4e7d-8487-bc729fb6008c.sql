ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS contributor text,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS event_title text;