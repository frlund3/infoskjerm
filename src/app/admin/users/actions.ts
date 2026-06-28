"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

export async function deleteUser(userId: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase.from("users").delete().eq("id", userId)
  if (error) return { ok: false, error: error.message }
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
