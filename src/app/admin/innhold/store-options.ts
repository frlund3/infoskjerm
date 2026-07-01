import { requireRole } from "@/lib/admin/require-role"
import type { StoreOption } from "./_components/content-form"

/**
 * Loads store options including each store's tag ids, so the content form can
 * show a live "→ vises på N butikker" reach count for tag-based targeting.
 * Shared by the new/edit content pages (internal + customer).
 */

type AdminSupabase = Awaited<ReturnType<typeof requireRole>>["supabase"]

export async function loadStoreOptions(supabase: AdminSupabase, tenantId: string): Promise<StoreOption[]> {
  const [{ data: stores }, { data: storeTags }] = await Promise.all([
    supabase.from("stores").select("id, name, city, chains(name)").eq("tenant_id", tenantId).order("name"),
    supabase.from("store_tags").select("store_id, tag_id"),
  ])
  const tagsByStore = new Map<string, string[]>()
  for (const r of storeTags ?? []) {
    if (!r.store_id || !r.tag_id) continue
    const arr = tagsByStore.get(r.store_id) ?? []
    arr.push(r.tag_id)
    tagsByStore.set(r.store_id, arr)
  }
  return (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    chain: (s.chains as { name: string } | null)?.name ?? null,
    city: s.city,
    tagIds: tagsByStore.get(s.id) ?? [],
  }))
}
