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
export function withFelles(list: Avdeling[], unitLabel: string): Avdeling[] {
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