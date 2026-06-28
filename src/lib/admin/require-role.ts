import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { type UserRole } from "@/lib/roles"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function requireRole(allowedRoles: UserRole[]): Promise<{ supabase: SupabaseClient; userId: string; role: UserRole; tenantId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? "store_employee") as UserRole

  if (!allowedRoles.includes(role)) {
    redirect("/admin")
  }

  return { supabase, userId: user.id, role, tenantId: profile?.tenant_id ?? "" }
}
