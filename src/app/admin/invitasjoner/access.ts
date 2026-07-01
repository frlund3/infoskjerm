import type { createAdminClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/roles"

/**
 * Store-level access scoping for invitations (content_items of type
 * "invitation"). Mirrors the canSee logic in
 * src/app/admin/innhold/content-data.ts: chain-wide roles (super_admin /
 * chain_manager) see everything in the tenant; area/store managers only see
 * invitations they authored OR that reach one of the stores assigned to them in
 * user_stores (via a content_targets store_id, a tag that maps to one of their
 * stores, or a target_all row).
 *
 * These pages use the service-role client (bypasses RLS), so this MUST be
 * enforced in app code — otherwise signup PII leaks across stores.
 */

type AdminClient = ReturnType<typeof createAdminClient>

interface Target {
  target_all: boolean | null
  store_id: string | null
  tag_id: string | null
}

interface InvitationRow {
  created_by: string
  content_targets?: Target[] | null
}

function isPrivileged(role: UserRole): boolean {
  return role === "super_admin" || role === "chain_manager"
}

/**
 * Builds the caller's reach: the set of stores they may access (from
 * user_stores) plus a tag→stores map used to resolve tag-targeted invitations.
 */
async function loadReach(
  admin: AdminClient,
  userId: string
): Promise<{ accessibleStores: Set<string>; tagToStores: Map<string, Set<string>> }> {
  const [{ data: userStores }, { data: storeTags }] = await Promise.all([
    admin.from("user_stores").select("store_id").eq("user_id", userId),
    admin.from("store_tags").select("store_id, tag_id"),
  ])
  const accessibleStores = new Set<string>()
  for (const r of userStores ?? []) if (r.store_id) accessibleStores.add(r.store_id)
  const tagToStores = new Map<string, Set<string>>()
  for (const r of storeTags ?? []) {
    if (!r.tag_id || !r.store_id) continue
    if (!tagToStores.has(r.tag_id)) tagToStores.set(r.tag_id, new Set())
    tagToStores.get(r.tag_id)!.add(r.store_id)
  }
  return { accessibleStores, tagToStores }
}

function invitationReachesCaller(
  inv: InvitationRow,
  userId: string,
  accessibleStores: Set<string>,
  tagToStores: Map<string, Set<string>>
): boolean {
  if (inv.created_by === userId) return true
  const targets = (inv.content_targets ?? []) as Target[]
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

/** Filters a list of invitations down to the ones the caller may see. */
export async function scopeInvitations<T extends InvitationRow>(
  admin: AdminClient,
  invitations: T[],
  userId: string,
  role: UserRole
): Promise<T[]> {
  if (isPrivileged(role)) return invitations
  const { accessibleStores, tagToStores } = await loadReach(admin, userId)
  return invitations.filter((inv) => invitationReachesCaller(inv, userId, accessibleStores, tagToStores))
}

/** True if the caller may open a single invitation's detail page. */
export async function canAccessInvitation(
  admin: AdminClient,
  invitation: InvitationRow,
  userId: string,
  role: UserRole
): Promise<boolean> {
  if (isPrivileged(role)) return true
  const { accessibleStores, tagToStores } = await loadReach(admin, userId)
  return invitationReachesCaller(invitation, userId, accessibleStores, tagToStores)
}
