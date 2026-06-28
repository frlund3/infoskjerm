-- RLS for screen_registration_codes
ALTER TABLE screen_registration_codes ENABLE ROW LEVEL SECURITY;

-- Kun brukere i samme tenant kan se og opprette koder
CREATE POLICY "tenant_can_read_own_codes"
  ON screen_registration_codes
  FOR SELECT
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_can_insert_codes"
  ON screen_registration_codes
  FOR INSERT
  WITH CHECK (tenant_id = get_my_tenant_id());

-- Service role kan oppdatere (f.eks. markere som brukt)
CREATE POLICY "service_can_update_codes"
  ON screen_registration_codes
  FOR UPDATE
  USING (true);
