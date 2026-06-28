"use server"

import { requireRole } from "@/lib/admin/require-role"
import { revalidatePath } from "next/cache"

export async function activatePriority(contentItemId: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("content_items")
    .update({ is_priority: true, status: "live" })
    .eq("id", contentItemId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/emergency")
  revalidatePath("/admin/content")
  return { ok: true }
}

export async function deactivatePriority(contentItemId: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("content_items")
    .update({ is_priority: false })
    .eq("id", contentItemId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/emergency")
  return { ok: true }
}

export async function deactivateAllPriority() {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("content_items")
    .update({ is_priority: false })
    .eq("is_priority", true)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/emergency")
  return { ok: true }
}
