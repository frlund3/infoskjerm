import { requireRole } from "@/lib/admin/require-role"
import { xiboFetchBinary } from "@/lib/xibo/client"
import { fetchScreensByStore, type StoreScreen } from "@/lib/xibo/screens"

/**
 * Proxies a display's latest screenshot from the Xibo engine. The browser can't
 * call Xibo directly (no token, engine not public), so this route fetches the
 * image server-side with the OAuth token and streams it back. 404 when the
 * player hasn't uploaded a screenshot yet.
 *
 * Xibo is ONE shared engine across all tenants, so `displayId` alone is not
 * authorization: we must confirm the display belongs to a store the caller can
 * access. Displays map to stores via their display-group name (= store name),
 * so we resolve the caller's accessible stores → their displays and deny (403)
 * any id that isn't among them.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export async function GET(_req: Request, { params }: { params: Promise<{ displayId: string }> }) {
  const { supabase, userId, role, tenantId } = await requireRole([...VIEW_ROLES])

  const { displayId } = await params
  const id = Number(displayId)
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Ugyldig skjerm-id", { status: 400 })
  }

  // Stores the caller may access: privileged roles see the whole tenant, area/
  // store roles only their assigned stores (via user_stores). Always scoped to
  // the active tenant so a cross-tenant display can never be reached.
  const privileged = role === "super_admin" || role === "chain_manager"
  let stores: { id: string; name: string }[] = []
  if (privileged) {
    const { data } = await supabase.from("stores").select("id, name").eq("tenant_id", tenantId)
    stores = data ?? []
  } else {
    const { data: userStores } = await supabase.from("user_stores").select("store_id").eq("user_id", userId)
    const storeIds = (userStores ?? []).map((r) => r.store_id).filter((v): v is string => Boolean(v))
    if (storeIds.length > 0) {
      const { data } = await supabase.from("stores").select("id, name").eq("tenant_id", tenantId).in("id", storeIds)
      stores = data ?? []
    }
  }

  // Displays for those stores, from the engine (grouped by display-group name).
  const screensByStore = await fetchScreensByStore(stores).catch(() => new Map<string, StoreScreen[]>())
  const accessibleDisplayIds = new Set<number>()
  for (const screens of screensByStore.values()) {
    for (const s of screens) accessibleDisplayIds.add(s.displayId)
  }
  if (!accessibleDisplayIds.has(id)) {
    return new Response("Ingen tilgang til denne skjermen", { status: 403 })
  }

  const image = await xiboFetchBinary(`/display/screenshot/${id}`)
  if (!image) {
    return new Response("Ingen skjermbilde tilgjengelig ennå", { status: 404 })
  }

  return new Response(image.buffer, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "no-store",
    },
  })
}
