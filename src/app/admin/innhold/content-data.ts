import { requireRole } from "@/lib/admin/require-role"
import type { ContentType } from "./actions"
import { audienceForType, type Audience } from "./audience"
import type { ContentRow } from "./_components/content-list-client"

/**
 * Loads content rows for one audience (customer vs internal), applying the same
 * per-role visibility filtering used across the CMS. Shared by the internal
 * "Innhold" list and the "Innhold kundeskjerm" list so they stay in sync.
 */

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

type StoreOpt = { id: string; name: string }

export interface ContentData {
  rows: ContentRow[]
  stores: StoreOpt[]
  tags: { id: string; name: string }[]
}

export async function loadContentForAudience(audience: Audience): Promise<ContentData> {
  const { supabase, userId, role, tenantId } = await requireRole([...AUTHOR_ROLES])

  const [{ data: items }, { data: stores }, { data: tags }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, type, status, body, valid_from, valid_to, created_at, updated_at, created_by, content_targets(target_all, store_id, tag_id)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase.from("stores").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase.from("tags").select("id, name").eq("tenant_id", tenantId).order("name"),
  ])

  const privileged = role === "super_admin" || role === "chain_manager"
  const accessibleStores = new Set<string>()
  const tagToStores = new Map<string, Set<string>>()
  if (!privileged) {
    const [{ data: userStores }, { data: storeTags }] = await Promise.all([
      supabase.from("user_stores").select("store_id").eq("user_id", userId),
      supabase.from("store_tags").select("store_id, tag_id"),
    ])
    for (const r of userStores ?? []) if (r.store_id) accessibleStores.add(r.store_id)
    for (const r of storeTags ?? []) {
      if (!r.tag_id || !r.store_id) continue
      if (!tagToStores.has(r.tag_id)) tagToStores.set(r.tag_id, new Set())
      tagToStores.get(r.tag_id)!.add(r.store_id)
    }
  }

  type Item = NonNullable<typeof items>[number]

  function audienceOf(it: Item): Audience {
    const a = (it.body as { audience?: Audience } | null)?.audience
    return a === "kunde" || a === "intern" ? a : audienceForType(it.type as ContentType)
  }

  function canSee(it: Item): boolean {
    if (privileged) return true
    if (it.created_by === userId) return true
    const targets = (it.content_targets ?? []) as { target_all: boolean | null; store_id: string | null; tag_id: string | null }[]
    if (targets.some((t) => t.target_all)) return true
    for (const t of targets) {
      if (t.store_id && accessibleStores.has(t.store_id)) return true
      if (t.tag_id) {
        const s = tagToStores.get(t.tag_id)
        if (s) for (const sid of accessibleStores) if (s.has(sid)) return true
      }
    }
    return false
  }

  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]))
  const tagName = new Map((tags ?? []).map((t) => [t.id, t.name]))

  const rows: ContentRow[] = (items ?? [])
    .filter((it) => audienceOf(it) === audience)
    .filter(canSee)
    .map((it) => {
      const targets = (it.content_targets ?? []) as { target_all: boolean | null; store_id: string | null; tag_id: string | null }[]
      const storeIds = targets.filter((t) => t.store_id).map((t) => t.store_id as string)
      const tagIds = targets.filter((t) => t.tag_id).map((t) => t.tag_id as string)
      let mode: ContentRow["target"]["mode"] = "none"
      if (storeIds.length) mode = "stores"
      else if (tagIds.length) mode = "tags"
      else if (targets.some((t) => t.target_all)) mode = "all"

      const names = mode === "stores"
        ? storeIds.map((id) => storeName.get(id)).filter((x): x is string => !!x)
        : mode === "tags"
          ? tagIds.map((id) => tagName.get(id)).filter((x): x is string => !!x)
          : []

      const body = (it.body ?? {}) as { imageUrl?: string | null; avdeling?: string | null }
      return {
        id: it.id,
        title: it.title,
        type: it.type,
        status: it.status,
        imageUrl: body.imageUrl ?? null,
        validFrom: it.valid_from,
        validTo: it.valid_to,
        updatedAt: it.updated_at,
        target: { mode, count: mode === "stores" ? storeIds.length : tagIds.length, names },
        storeIds,
        tagIds,
        avdeling: body.avdeling ?? null,
      }
    })

  return { rows, stores: stores ?? [], tags: tags ?? [] }
}
