"use server"

import { requireRole } from "@/lib/admin/require-role"
import { revalidatePath } from "next/cache"
import type { Json } from "@/types/database"

type AdminSupabase = Awaited<ReturnType<typeof requireRole>>["supabase"]

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export type ContentType = "news" | "competition" | "stats" | "weather" | "slide" | "job" | "birthday" | "ticker"
export type TargetMode = "all" | "stores" | "tags"
export type ImageMode = "plakat" | "bakgrunn"

export interface ContentInput {
  title: string
  type: ContentType
  bodyHtml: string
  imageUrl: string | null
  /** All attached images. 2+ → rendered full-page, side by side (no dimmed bg). */
  imageUrls?: string[]
  imageMode?: ImageMode
  targetMode: TargetMode
  storeIds: string[]
  tagIds: string[]
  validFrom: string | null
  validTo: string | null
  publish: boolean
  /** Job ads only: contact person + application link, shown on the card. */
  contactPerson?: string | null
  applyUrl?: string | null
  /** Sales (stats) only: the KPI value + change indicator. */
  statsValue?: string | null
  statsChange?: string | null
}

export interface SaveResult {
  ok: boolean
  id?: string
  error?: string
}

async function effectiveTenant(supabase: AdminSupabase, tenantId: string): Promise<string> {
  if (tenantId) return tenantId
  const { data } = await supabase.from("tenants").select("id").limit(1).single()
  return data?.id ?? ""
}

/** Builds the content_items.body payload, including type-specific fields. */
function buildBody(input: ContentInput): Json {
  const imageUrls = (input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : [])).filter(Boolean)
  return JSON.parse(JSON.stringify({
    html: input.bodyHtml,
    imageUrl: imageUrls[0] ?? input.imageUrl ?? null,
    imageUrls,
    imageMode: input.imageMode ?? "bakgrunn",
    ...(input.type === "job" ? { contactPerson: input.contactPerson ?? null, applyUrl: input.applyUrl ?? null } : {}),
    ...(input.type === "stats" ? { statsValue: input.statsValue ?? null, statsChange: input.statsChange ?? null } : {}),
  })) as Json
}

export async function saveContent(input: ContentInput, id?: string): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = await effectiveTenant(supabase, rawTenant)

  if (!input.title.trim()) return { ok: false, error: "Tittel er påkrevd" }

  const body = buildBody(input)
  const status = input.publish ? "live" : "draft"

  let contentId = id
  if (id) {
    const { error } = await supabase
      .from("content_items")
      .update({
        title: input.title.trim(),
        type: input.type,
        body,
        status,
        valid_from: input.validFrom || null,
        valid_to: input.validTo || null,
        updated_at: new Date().toISOString(),
        published_at: input.publish ? new Date().toISOString() : null,
      })
      .eq("id", id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        title: input.title.trim(),
        type: input.type,
        body,
        status,
        tenant_id: tenantId,
        created_by: userId,
        valid_from: input.validFrom || null,
        valid_to: input.validTo || null,
        published_at: input.publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? "Kunne ikke opprette" }
    contentId = data.id
  }

  // Reset and rebuild targets
  await supabase.from("content_targets").delete().eq("content_item_id", contentId!)
  let targetRows: { content_item_id: string; target_all?: boolean; store_id?: string; tag_id?: string }[] = []
  if (input.targetMode === "all") {
    targetRows = [{ content_item_id: contentId!, target_all: true }]
  } else if (input.targetMode === "stores") {
    targetRows = input.storeIds.map((sid) => ({ content_item_id: contentId!, store_id: sid }))
  } else if (input.targetMode === "tags") {
    targetRows = input.tagIds.map((tid) => ({ content_item_id: contentId!, tag_id: tid }))
  }
  if (targetRows.length > 0) {
    const { error } = await supabase.from("content_targets").insert(targetRows)
    if (error) return { ok: false, error: error.message }
  }

  // Skjermene leser publisert innhold live fra Supabase via /widget/nyheter, så
  // selve publiseringen er bare denne lagringen — ingen ekstern synk.
  revalidatePath("/admin/innhold")
  return { ok: true, id: contentId }
}

export async function deleteContent(id: string): Promise<SaveResult> {
  const { supabase } = await requireRole([...AUTHOR_ROLES])
  await supabase.from("content_targets").delete().eq("content_item_id", id)
  const { error } = await supabase.from("content_items").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/innhold")
  return { ok: true }
}

export async function duplicateContent(id: string): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = await effectiveTenant(supabase, rawTenant)
  const { data: orig } = await supabase
    .from("content_items")
    .select("title, type, body, valid_from, valid_to")
    .eq("id", id)
    .single()
  if (!orig) return { ok: false, error: "Fant ikke innholdet" }

  const { data: copy, error } = await supabase
    .from("content_items")
    .insert({
      title: `${orig.title} (kopi)`,
      type: orig.type,
      body: orig.body,
      status: "draft",
      tenant_id: tenantId,
      created_by: userId,
      valid_from: orig.valid_from,
      valid_to: orig.valid_to,
    })
    .select("id")
    .single()
  if (error || !copy) return { ok: false, error: error?.message ?? "Kunne ikke kopiere" }

  const { data: targets } = await supabase.from("content_targets").select("target_all, store_id, tag_id").eq("content_item_id", id)
  if (targets && targets.length > 0) {
    await supabase.from("content_targets").insert(
      targets.map((t) => ({ content_item_id: copy.id, target_all: t.target_all, store_id: t.store_id, tag_id: t.tag_id }))
    )
  }
  revalidatePath("/admin/innhold")
  return { ok: true, id: copy.id }
}
