-- Registreringskoder for selvbetjent skjermoppsett
CREATE TABLE IF NOT EXISTS screen_registration_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  screen_id uuid REFERENCES screens(id) ON DELETE SET NULL
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS screen_registration_codes_code_idx ON screen_registration_codes(code);
