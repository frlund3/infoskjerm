-- Time-based scheduling: show content only on certain days/times
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS schedule_rule JSONB;

-- Priority/emergency flag: priority content bypasses normal playlist
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN content_items.schedule_rule IS
  'Optional: {"days":[0-6], "start_time":"HH:MM", "end_time":"HH:MM"}. 0=Sunday. Null = always show.';
COMMENT ON COLUMN content_items.is_priority IS
  'Emergency/priority content: served before all other content on all screens in tenant';
