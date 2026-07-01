/**
 * Per-tenant funksjonskapabiliteter (feature flags).
 *
 * Dette er mekanismen for å bygge funksjonalitet/maler som KUN skal vises for
 * bestemte tenants — uten å hardkode tenant-navn i UI-koden. Hver funksjon/mal
 * sjekker `hasFeature(config.features, "<flagg>")`.
 *
 * Slå på for en tenant ved å sette `tenants.features` (jsonb), f.eks.
 *   {"offerCards": true, "gln": true}
 * Alt som ikke er satt = av. Nye tenants er «lean» som standard (opt-in per tenant).
 *
 * Legg til en ny funksjon:
 *   1. Legg nøkkel + doc her i TENANT_FEATURES.
 *   2. Gate UI/route med hasFeature(...).
 *   3. Slå på for aktuelle tenants i en migrasjon (tenants.features).
 */
export const TENANT_FEATURES = {
  /** Varekort-bygger (struktur), masseimport av tilbud og spar.no-oppslag — dagligvare. */
  offerCards: "Varekort & masseimport",
  /** GLN / EPD-lokasjonsnummer på enheter — dagligvare (EDI mot Tradesolution). */
  gln: "GLN / EPD-lokasjonsnummer",
} as const

export type TenantFeature = keyof typeof TENANT_FEATURES

export type TenantFeatures = Partial<Record<TenantFeature, boolean>>

/** Leser og validerer `tenants.features` (ukjent jsonb) til et typet, trygt sett. */
export function parseTenantFeatures(raw: unknown): TenantFeatures {
  if (!raw || typeof raw !== "object") return {}
  const source = raw as Record<string, unknown>
  const out: TenantFeatures = {}
  for (const key of Object.keys(TENANT_FEATURES) as TenantFeature[]) {
    if (source[key] === true) out[key] = true
  }
  return out
}

/** True hvis tenanten har den gitte funksjonen slått på. */
export function hasFeature(features: TenantFeatures | undefined, feature: TenantFeature): boolean {
  return features?.[feature] === true
}
