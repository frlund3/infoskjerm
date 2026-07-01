import { createClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { redirect } from "next/navigation"
import { type UserRole } from "@/lib/roles"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Vokter en vanlig admin-rute. `tenantId` er den EFFEKTIVE tenanten (aktiv tenant
 * når super_admin opptrer som en). En super_admin som ikke har valgt tenant sendes
 * til /admin/plattform for å velge først.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ supabase: SupabaseClient; userId: string; role: UserRole; tenantId: string; isImpersonating: boolean }> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")

  if (!allowedRoles.includes(ctx.role)) {
    redirect("/admin")
  }

  if (ctx.role === "super_admin" && !ctx.isImpersonating) {
    redirect("/admin/plattform")
  }

  const supabase = await createClient()
  return {
    supabase,
    userId: ctx.userId,
    role: ctx.role,
    tenantId: ctx.effectiveTenantId,
    isImpersonating: ctx.isImpersonating,
  }
}

/** Vokter superadmin-plattformseksjonen uten å tvinge tenant-valg. */
export async function requireSuperAdmin(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")
  const supabase = await createClient()
  return { supabase, userId: ctx.userId }
}
