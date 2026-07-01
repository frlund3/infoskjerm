import { type TenantFeatures } from "@/lib/tenant/features"

/**
 * Tenant-styrt terminologi, avdelinger, merke og funksjonskapabiliteter. Lar en
 * bilforhandler-tenant si «Forhandler» i stedet for «Butikk», ha bil-avdelinger
 * i stedet for mat, og skru av dagligvare-spesifikke funksjoner (se features.ts).
 *
 * Denne fila er CLIENT-TRYGG (importeres av TenantConfigProvider for typer +
 * DEFAULT_TENANT_CONFIG). Selve lastingen — som trenger service-role og dermed
 * next/headers — ligger i config-server.ts.
 */

export interface Avdeling {
  key: string
  label: string
}

export interface TenantConfig {
  unitLabel: string        // «Butikk» | «Forhandler»
  unitLabelPlural: string  // «Butikker» | «Forhandlere»
  brand: string            // tenant-merke for topbar/branding (navn uten «AS»-suffiks); «» = ingen
  avdelinger: Avdeling[]
  features: TenantFeatures // per-tenant funksjonsflagg (offerCards, gln, …)
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  unitLabel: "Butikk",
  unitLabelPlural: "Butikker",
  brand: "",
  avdelinger: [{ key: "felles", label: "Hele butikken" }],
  features: {},
}
