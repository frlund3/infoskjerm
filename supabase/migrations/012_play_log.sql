CREATE TABLE IF NOT EXISTS play_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  module_key TEXT NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  slide_index INTEGER
);

CREATE INDEX IF NOT EXISTS play_log_screen_id_idx ON play_log(screen_id);
CREATE INDEX IF NOT EXISTS play_log_content_item_id_idx ON play_log(content_item_id);
CREATE INDEX IF NOT EXISTS play_log_played_at_idx ON play_log(played_at DESC);
CREATE INDEX IF NOT EXISTS play_log_tenant_id_idx ON play_log(tenant_id);

-- RLS
ALTER TABLE play_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screens can insert own play_log" ON play_log
  FOR INSERT WITH CHECK (
    screen_id IN (
      SELECT id FROM screens WHERE token = current_setting('request.jwt.claims', true)::json->>'token'
    ) OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "tenant members can read play_log" ON play_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
