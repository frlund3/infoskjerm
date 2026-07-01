import { cookies } from "next/headers"
import { createClient, createAdminClient } from "@/lib/supabase/server"
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

/**
 * Full server-side kontekst for admin. Leser innlogget bruker + aktiv-tenant-cookie.
 * Tenant-oppslag for super_admin gjøres via service-role (tenants har RLS uten
 * SELECT-policy), og kun etter at rollen er verifisert fra brukerens egen rad.
 * Returnerer null når ingen er innlogget.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? "store_employee") as UserRole
  const realTenantId = profile?.tenant_id ?? ""

  const cookieStore = await cookies()
  const cookieTenantId =
    role === "super_admin" ? (cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? null) : null

  let activeTenant: ActiveTenant | null = null
  if (role === "super_admin" && cookieTenantId) {
    const admin = createAdminClient()
    const { data } = await admin
      .from("tenants")
      .select("id, name, slug")
      .eq("id", cookieTenantId)
      .maybeSingle()
    activeTenant = data ?? null
  }

  const { effectiveTenantId, isImpersonating } = resolveEffectiveTenant({
    role,
    realTenantId,
    cookieTenantId,
    activeTenantValid: activeTenant !== null,
  })

  return { userId: user.id, role, realTenantId, effectiveTenantId, isImpersonating, activeTenant }
}
