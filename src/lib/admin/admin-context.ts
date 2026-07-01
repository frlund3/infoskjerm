import { type UserRole } from "@/lib/roles"

export const ACTIVE_TENANT_COOKIE = "sa_active_tenant"

export interface ActiveTenant {
  id: string
  name: string
  slug: string
}

export interface AdminContext {
  userId: string
  role: UserRole
  realTenantId: string
  effectiveTenantId: string
  isImpersonating: boolean
  activeTenant: ActiveTenant | null
}

/**
 * Ren, testbar kjerne: bestem hvilken tenant alt skal scopes til.
 * Kun super_admin med gyldig aktiv-tenant-cookie impersonerer; alle andre
 * bruker sin egen tenant (RLS scoper dem uansett).
 */
export function resolveEffectiveTenant(args: {
  role: UserRole
  realTenantId: string
  cookieTenantId: string | null
  activeTenantValid: boolean
}): { effectiveTenantId: string; isImpersonating: boolean } {
  const { role, realTenantId, cookieTenantId, activeTenantValid } = args
  if (role === "super_admin" && cookieTenantId && activeTenantValid) {
    return { effectiveTenantId: cookieTenantId, isImpersonating: true }
  }
  return { effectiveTenantId: realTenantId, isImpersonating: false }
}
