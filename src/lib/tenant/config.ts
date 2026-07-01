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
  avdelinger: Avdeling[]
  features: TenantFeatures // per-tenant funksjonsflagg (offerCards, gln, …)
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  unitLabel: "Butikk",
  unitLabelPlural: "Butikker",
  avdelinger: [{ key: "felles", label: "Hele butikken" }],
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
    .select("unit_label, unit_label_plural, avdelinger, features")
    .eq("id", tenantId)
    .single()
  if (!data) return DEFAULT_TENANT_CONFIG
  const raw = data as { unit_label: string | null; unit_label_plural: string | null; avdelinger: unknown; features: unknown }
  const avdelinger = Array.isArray(raw.avdelinger)
    ? (raw.avdelinger as Avdeling[]).filter((a) => a && typeof a.key === "string" && typeof a.label === "string")
    : DEFAULT_TENANT_CONFIG.avdelinger
  return {
    unitLabel: raw.unit_label?.trim() || DEFAULT_TENANT_CONFIG.unitLabel,
    unitLabelPlural: raw.unit_label_plural?.trim() || DEFAULT_TENANT_CONFIG.unitLabelPlural,
    avdelinger: avdelinger.length ? avdelinger : DEFAULT_TENANT_CONFIG.avdelinger,
    features: parseTenantFeatures(raw.features),
  }
}
