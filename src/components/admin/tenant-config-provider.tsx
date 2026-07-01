"use client"

import { createContext, useContext } from "react"
import { DEFAULT_TENANT_CONFIG, type TenantConfig } from "@/lib/tenant/config"

/**
 * Gjør tenant-terminologi (Butikk/Forhandler) og avdelinger tilgjengelig for
 * klient-komponenter i admin. Server-komponenter kaller getTenantConfig direkte.
 */

const TenantConfigContext = createContext<TenantConfig>(DEFAULT_TENANT_CONFIG)

export function TenantConfigProvider({ config, children }: { config: TenantConfig; children: React.ReactNode }) {
  return <TenantConfigContext.Provider value={config}>{children}</TenantConfigContext.Provider>
}

export function useTenantConfig(): TenantConfig {
  return useContext(TenantConfigContext)
}
