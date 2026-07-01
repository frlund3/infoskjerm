"use client"

import { createContext, useContext } from "react"
import { DEFAULT_TENANT_CONFIG, type TenantConfig } from "@/lib/tenant/config"
import { hasFeature, type TenantFeature } from "@/lib/tenant/features"

/**
 * Gjør tenant-terminologi (Butikk/Forhandler), avdelinger og funksjonsflagg
 * tilgjengelig for klient-komponenter i admin. Server-komponenter kaller
 * getTenantConfig direkte.
 */

const TenantConfigContext = createContext<TenantConfig>(DEFAULT_TENANT_CONFIG)

export function TenantConfigProvider({ config, children }: { config: TenantConfig; children: React.ReactNode }) {
  return <TenantConfigContext.Provider value={config}>{children}</TenantConfigContext.Provider>
}

export function useTenantConfig(): TenantConfig {
  return useContext(TenantConfigContext)
}

/** True hvis den innloggede brukerens tenant har funksjonen slått på. */
export function useTenantFeature(feature: TenantFeature): boolean {
  return hasFeature(useContext(TenantConfigContext).features, feature)
}
