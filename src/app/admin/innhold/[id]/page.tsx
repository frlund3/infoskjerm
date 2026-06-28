import { requireRole } from "@/lib/admin/require-role"
import { notFound } from "next/navigation"
import { ContentForm, type StoreOption, type TagOption, type ContentInitial } from "../_components/content-form"
import type { ContentType, TargetMode } from "../actions"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireRole([...AUTHOR_ROLES])

  const [{ data: item }, { data: stores }, { data: tags }, { data: targets }] = await Promise.all([
    supabase.from("content_items").select("id, title, type, body, valid_from, valid_to").eq("id", id).single(),
    supabase.from("stores").select("id, name, city, chains(name)").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase.from("content_targets").select("target_all, store_id, tag_id").eq("content_item_id", id),
  ])

  if (!item) notFound()

  const body = (item.body ?? {}) as { html?: string; imageUrl?: string | null }
  const targetRows = targets ?? []
  let targetMode: TargetMode = "all"
  if (targetRows.some((t) => t.store_id)) targetMode = "stores"
  else if (targetRows.some((t) => t.tag_id)) targetMode = "tags"
  else if (targetRows.some((t) => t.target_all)) targetMode = "all"

  const initial: ContentInitial = {
    id: item.id,
    title: item.title,
    type: item.type as ContentType,
    bodyHtml: body.html ?? "",
    imageUrl: body.imageUrl ?? null,
    targetMode,
    storeIds: targetRows.filter((t) => t.store_id).map((t) => t.store_id as string),
    tagIds: targetRows.filter((t) => t.tag_id).map((t) => t.tag_id as string),
    validFrom: item.valid_from ? item.valid_from.slice(0, 10) : null,
    validTo: item.valid_to ? item.valid_to.slice(0, 10) : null,
  }

  const storeOptions: StoreOption[] = (stores ?? []).map((s) => ({
    id: s.id, name: s.name, chain: (s.chains as { name: string } | null)?.name ?? null, city: s.city,
  }))

  return <ContentForm stores={storeOptions} tags={(tags ?? []) as TagOption[]} initial={initial} />
}
