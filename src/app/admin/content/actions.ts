"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function duplicateContentItem(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Ikke innlogget" }

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
    created_by: user.id,
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
  const supabase = await createClient()
  await supabase.from("content_items").delete().eq("id", id)
  revalidatePath("/admin/content")
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/competitions")
  revalidatePath("/admin/content/stats")
  revalidatePath("/admin/content/slides")
  revalidatePath("/admin/content/weather")
}

export async function quickApprove(id: string) {
  const supabase = await createClient()
  await supabase.from("content_items").update({ status: "approved" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}

export async function rejectContentItem(id: string) {
  const supabase = await createClient()
  await supabase.from("content_items").update({ status: "rejected" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}
