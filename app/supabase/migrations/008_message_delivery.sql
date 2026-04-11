-- 008: Message delivery worker support
-- Adds retry tracking columns and a partial index for efficient queue polling.

ALTER TABLE public.message
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Partial index: only indexes queued rows, stays small as messages transition out
CREATE INDEX IF NOT EXISTS message_queued_idx
  ON public.message (created_at ASC)
  WHERE status = 'queued';
