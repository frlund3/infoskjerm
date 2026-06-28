CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  thumbnail_url TEXT,
  body JSONB NOT NULL DEFAULT '{}',
  is_global BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_templates_tenant_idx ON content_templates(tenant_id);
CREATE INDEX IF NOT EXISTS content_templates_type_idx ON content_templates(type);

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read templates" ON content_templates
  FOR SELECT USING (
    is_global = true OR
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "super_admin can manage templates" ON content_templates
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );

-- Seed: global templates available to all tenants
INSERT INTO content_templates (name, description, type, is_global, sort_order, body) VALUES
(
  'Ukens tilbud',
  'Stort produktbilde med pris og rabatt',
  'news',
  true,
  1,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "news", "durationSeconds": 30, "fields": {"title": "Ukens tilbud", "body": "Beskriv tilbudet her. Gjelder hele uken.", "image_url": null}}]}}'
),
(
  'Salgskampanje',
  'Fremhev et produkt med bilde og kampanjepris',
  'competition',
  true,
  2,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "competition", "durationSeconds": 25, "fields": {"title": "Kampanje", "description": "Beskriv kampanjen", "image_url": null, "cta": "Kjøp nå"}}]}}'
),
(
  'Velkomstskjerm',
  'Enkel velkomst med åpningstider',
  'slide',
  true,
  3,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "slide", "durationSeconds": 20, "fields": {"title": "Velkommen!", "subtitle": "Vi er åpne man-fre 08-20, lør 09-18"}}]}}'
),
(
  'Vær-widget',
  'Lokalt vær fra Yr.no',
  'weather',
  true,
  4,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "weather", "durationSeconds": 20, "fields": {"lat": "59.9139", "lon": "10.7522", "location_name": "Oslo"}}]}}'
),
(
  'Salgstall i dag',
  'KPI-kort med dagens omsetning',
  'stats',
  true,
  5,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "sales-stats", "durationSeconds": 15, "fields": {"title": "Omsetning i dag", "period": "Dagens tall", "actual": 0, "target": 50000, "unit": "kr"}}]}}'
),
(
  'Power BI rapport',
  'Vis Power BI dashboard fra «Publish to web»',
  'stats',
  true,
  6,
  '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "powerbi", "durationSeconds": 60, "fields": {"embed_url": "", "refresh_interval": 300}}]}}'
);
