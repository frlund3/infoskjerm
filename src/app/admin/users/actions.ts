"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { type UserRole } from "@/lib/roles"

export async function inviteUser(email: string, role: Exclude<UserRole, "super_admin">) {
  await requireRole(["super_admin", "chain_manager"])
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/users")
  return { ok: true }
}

export async function deleteUser(userId: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase.from("users").delete().eq("id", userId)
  if (error) return { ok: false, error: error.message }

  // Also delete from Supabase Auth so the user cannot log in again
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  // Don't block the response if auth deletion fails — the row is already deleted
  if (authError) {
    console.error("Feil ved sletting fra auth.users:", authError.message)
  }

  revalidatePath("/admin/users")
  return { ok: true }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/users")
  return { ok: true }
}
