"use server"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"

export async function duplicateContentItem(id: string) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager", "store_manager"])

  const { data: original } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .single()

  if (!original) return { ok: false, error: "Innhold ikke funnet" }

  const { error } = await supabase.from("content_items").insert({
    title: `Kopi av ${original.title}`,
    type: original.type,
    body: original.body,
    status: "draft",
    tenant_id: original.tenant_id,
    created_by: userId,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/competitions")
  revalidatePath("/admin/content/stats")
  revalidatePath("/admin/content/slides")
  revalidatePath("/admin/content/weather")
  return { ok: true }
}

export async function deleteContentItem(id: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager", "store_manager"])
  await supabase.from("content_items").delete().eq("id", id)
  revalidatePath("/admin/content")
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/competitions")
  revalidatePath("/admin/content/stats")
  revalidatePath("/admin/content/slides")
  revalidatePath("/admin/content/weather")
}

export async function quickApprove(id: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  await supabase.from("content_items").update({ status: "approved" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}

export async function rejectContentItem(id: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  await supabase.from("content_items").update({ status: "rejected" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}
