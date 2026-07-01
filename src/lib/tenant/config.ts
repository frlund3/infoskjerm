import type { createClient } from "@/lib/supabase/server"
import { parseTenantFeatures, type TenantFeatures } from "@/lib/tenant/features"

/**
 * Tenant-styrt terminologi, avdelinger og funksjonskapabiliteter. Lar en
 * bilforhandler-tenant si «Forhandler» i stedet for «Butikk», ha bil-avdelinger
 * i stedet for mat, og skru av dagligvare-spesifikke funksjoner (se features.ts).
 * Lastes i admin-layouten og gjøres tilgjengelig via TenantConfigProvider.
 */

export interface Avdeling {
  key: string
  label: string
}

export interface TenantConfig {
  unitLabel: string        // «Butikk» | «Forhandler»
  unitLabelPlural: string  // «Butikker» | «Forhandlere»
  brand: string            // tenant-merke for topbar/branding (navn uten «AS»-suffiks); «» = ingen
  avdelinger: Avdeling[]        // KUNDE-avdelinger (per tenant)
  avdelingerIntern: Avdeling[]  // INTERNE avdelinger (per tenant, uavhengig av kunde)
  features: TenantFeatures // per-tenant funksjonsflagg (offerCards, gln, …)
}

/** «Hele enheten»-label derivert fra terminologi: «Butikk»→«Hele butikken», «Forhandler»→«Hele forhandleren». */
export function heleEnhetenLabel(unitLabel: string): string {
  const w = (unitLabel || "Butikk").trim().toLowerCase()
  return `Hele ${w}en`
}

/** Sikrer at «felles» (Hele enheten) ligger først, med label derivert fra terminologi. */
function withFelles(list: Avdeling[], unitLabel: string): Avdeling[] {
  const rest = list.filter((a) => a.key !== "felles")
  return [{ key: "felles", label: heleEnhetenLabel(unitLabel) }, ...rest]
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  unitLabel: "Butikk",
  unitLabelPlural: "Butikker",
  brand: "",
  avdelinger: [{ key: "felles", label: "Hele butikken" }],
  avdelingerIntern: [{ key: "felles", label: "Hele butikken" }],
  features: {},
}

type AdminSupabase = Awaited<ReturnType<typeof createClient>>

/** Laster tenant-konfig for den innloggede brukeren (via users.tenant_id → tenants). */
export async function getTenantConfig(supabase: AdminSupabase, tenantId: string | null): Promise<TenantConfig> {
  if (!tenantId) return DEFAULT_TENANT_CONFIG
  // Nye kolonner (028) er ikke i den genererte Database-typen ennå → cast.
  const { data } = await (supabase.from("tenants") as unknown as {
    select: (cols: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: unknown }> } }
  })
    .select("name, unit_label, unit_label_plural, avdelinger, avdelinger_intern, features")
    .eq("id", tenantId)
    .single()
  if (!data) return DEFAULT_TENANT_CONFIG
  const raw = data as { name: string | null; unit_label: string | null; unit_label_plural: string | null; avdelinger: unknown; avdelinger_intern: unknown; features: unknown }
  const parseList = (v: unknown): Avdeling[] =>
    Array.isArray(v) ? (v as Avdeling[]).filter((a) => a && typeof a.key === "string" && typeof a.label === "string") : []
  const unitLabel = raw.unit_label?.trim() || DEFAULT_TENANT_CONFIG.unitLabel
  return {
    unitLabel,
    unitLabelPlural: raw.unit_label_plural?.trim() || DEFAULT_TENANT_CONFIG.unitLabelPlural,
    // Merke = tenant-navn uten «AS»-suffiks (f.eks. «Gange-Rolv AS»→«Gange-Rolv», «Mobile AS»→«Mobile»).
    brand: (raw.name?.trim() || "").replace(/\s+AS$/i, ""),
    // «felles» ligger alltid først med label derivert fra terminologi.
    avdelinger: withFelles(parseList(raw.avdelinger), unitLabel),
    avdelingerIntern: withFelles(parseList(raw.avdelinger_intern), unitLabel),
    features: parseTenantFeatures(raw.features),
  }
}
