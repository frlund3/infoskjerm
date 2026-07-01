import { createAdminClient } from "@/lib/supabase/server"
import { parseTenantFeatures } from "@/lib/tenant/features"
import { DEFAULT_TENANT_CONFIG, type TenantConfig, type Avdeling } from "./config"

/**
 * Server-only lasting av tenant-config. Bruker service-role fordi super_admin IKKE
 * får lese en ANNEN tenant sin rad via RLS (act-as) — terminologi/merke/avdelinger
 * ville da falt til default. tenantId er allerede den verifiserte effektive tenanten,
 * så dette lekker ikke på tvers.
 *
 * Egen fil (ikke config.ts) fordi createAdminClient drar inn next/headers, som ville
 * brutt client-bundelen der config.ts importeres av TenantConfigProvider.
 *
 * `_supabase` beholdes i signaturen for bakoverkompatibilitet med kallstedene.
 */
export async function getTenantConfig(_supabase: unknown, tenantId: string | null): Promise<TenantConfig> {
  if (!tenantId) return DEFAULT_TENANT_CONFIG
  const admin = createAdminClient()
  // Nye kolonner (028) er ikke i den genererte Database-typen ennå → cast.
  const { data } = await (admin.from("tenants") as unknown as {
    select: (cols: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: unknown }> } }
  })
    .select("name, unit_label, unit_label_plural, logo_url, avdelinger, features")
    .eq("id", tenantId)
    .single()
  if (!data) return DEFAULT_TENANT_CONFIG
  const raw = data as { name: string | null; unit_label: string | null; unit_label_plural: string | null; logo_url: string | null; avdelinger: unknown; features: unknown }
  const avdelinger = Array.isArray(raw.avdelinger)
    ? (raw.avdelinger as Avdeling[]).filter((a) => a && typeof a.key === "string" && typeof a.label === "string")
    : DEFAULT_TENANT_CONFIG.avdelinger
  return {
    unitLabel: raw.unit_label?.trim() || DEFAULT_TENANT_CONFIG.unitLabel,
    unitLabelPlural: raw.unit_label_plural?.trim() || DEFAULT_TENANT_CONFIG.unitLabelPlural,
    // Merke = tenant-navn uten «AS»-suffiks («Gange-Rolv AS»→«Gange-Rolv», «Mobile AS»→«Mobile»).
    brand: (raw.name?.trim() || "").replace(/\s+AS$/i, ""),
    logoUrl: raw.logo_url?.trim() || null,
    avdelinger: avdelinger.length ? avdelinger : DEFAULT_TENANT_CONFIG.avdelinger,
    features: parseTenantFeatures(raw.features),
  }
}
