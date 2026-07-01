"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAdminContext, ACTIVE_TENANT_COOKIE } from "@/lib/admin/admin-context"
import { getTenantById } from "@/lib/admin/tenants"

/**
 * Setter (eller tømmer, ved null) aktiv tenant for en super_admin og redirecter.
 * Ikke-super_admin avvises. Ukjent tenant ignoreres (tømmer cookie).
 */
export async function setActiveTenant(tenantId: string | null): Promise<void> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")

  const cookieStore = await cookies()

  if (tenantId === null) {
    cookieStore.delete(ACTIVE_TENANT_COOKIE)
    redirect("/admin/plattform")
  }

  const tenant = await getTenantById(tenantId)
  if (!tenant) {
    cookieStore.delete(ACTIVE_TENANT_COOKIE)
    redirect("/admin/plattform")
  }

  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
  })
  redirect("/admin")
}
