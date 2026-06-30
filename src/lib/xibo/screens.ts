import { xiboFetch, fetchLayoutNames, type XiboDisplay } from "./client"

/**
 * Real screens per store, read live from the screen engine (Xibo). A store's
 * customer screens are the displays assigned to its display group (the group
 * named exactly after the store). Read-only — CMS users see status here but
 * never log into Xibo. Returns an empty map if the engine is unreachable, so an
 * admin page never crashes on a screen-engine hiccup.
 */

export type ScreenSync = "ok" | "downloading" | "stale" | "unknown"

/** Which screen a store display is: customer-facing, back-room, or a department. */
export type ScreenRole = "kunde" | "bakrom" | "avdeling"

export interface StoreScreen {
  displayId: number
  name: string
  online: boolean
  lastSeen: string | null
  /** Whether the player holds the current content, is downloading, or is stale. */
  sync: ScreenSync
  /** Layout the player reports it is showing right now (resolved name). */
  currentLayout: string | null
  clientVersion: string | null
  /** The display group this screen belongs to — target for a "collect now" push. */
  displayGroupId: number
  /** Role derived from the display group name (kunde/bakrom/avdeling). */
  role: ScreenRole
  /** Human label, e.g. "Kunde", "Bakrom", "Avdeling: Frukt & grønt". */
  roleLabel: string
}

/**
 * Derive a screen's role from its display-group name. Convention:
 *   "{butikk}"            → kunde (customer screen)
 *   "{butikk} – Bakrom"   → bakrom (staff/back-room)
 *   "{butikk} – {Avd}"    → avdeling (department screen)
 */
function roleFromGroup(groupName: string, storeName: string): { role: ScreenRole; label: string } {
  if (groupName === storeName) return { role: "kunde", label: "Kunde" }
  const suffix = groupName.slice(storeName.length).replace(/^\s*–\s*/, "").trim()
  if (suffix.toLowerCase() === "bakrom") return { role: "bakrom", label: "Bakrom" }
  return { role: "avdeling", label: `Avdeling: ${suffix}` }
}

interface XiboGroup {
  displayGroupId: number
  displayGroup: string
}

/** Xibo lastAccessed may be a unix timestamp (seconds) or an ISO string. */
function parseLastSeen(raw: string | null): string | null {
  if (!raw) return null
  const asNum = Number(raw)
  const d = Number.isFinite(asNum) && asNum > 0 ? new Date(asNum * 1000) : new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })
}

function syncFrom(status: number | null | undefined): ScreenSync {
  switch (status) {
    case 1:
      return "ok"
    case 2:
      return "downloading"
    case 3:
      return "stale"
    default:
      return "unknown"
  }
}

export async function fetchScreensByStore(
  stores: { id: string; name: string }[]
): Promise<Map<string, StoreScreen[]>> {
  const result = new Map<string, StoreScreen[]>()
  if (stores.length === 0) return result

  let groups: XiboGroup[]
  let layoutNames: Map<number, string>
  try {
    ;[groups, layoutNames] = await Promise.all([
      xiboFetch<XiboGroup[]>("/displaygroup", { query: { isDisplaySpecific: 0, length: 1000 } }),
      fetchLayoutNames().catch(() => new Map<number, string>()),
    ])
  } catch {
    return result
  }
  await Promise.all(
    stores.map(async (store) => {
      // ALL of the store's groups: the customer group (exact name) plus any
      // "{butikk} – …" group (bakrom + department screens).
      const myGroups = (groups ?? []).filter(
        (g) => g.displayGroup === store.name || g.displayGroup.startsWith(`${store.name} – `)
      )
      if (myGroups.length === 0) {
        result.set(store.id, [])
        return
      }
      const perGroup = await Promise.all(
        myGroups.map(async (g) => {
          const { role, label } = roleFromGroup(g.displayGroup, store.name)
          try {
            const displays = await xiboFetch<XiboDisplay[]>("/display", {
              query: { displayGroupId: g.displayGroupId, length: 1000 },
            })
            return (displays ?? []).map((d) => ({
              displayId: d.displayId,
              name: d.display,
              online: d.loggedIn === 1,
              lastSeen: parseLastSeen(d.lastAccessed),
              sync: syncFrom(d.mediaInventoryStatus),
              currentLayout: d.currentLayoutId ? layoutNames.get(d.currentLayoutId) ?? null : null,
              clientVersion: d.clientVersion ?? null,
              displayGroupId: g.displayGroupId,
              role,
              roleLabel: label,
            }))
          } catch {
            return [] as StoreScreen[]
          }
        })
      )
      // A display lives in one group, but dedupe defensively, then order
      // kunde → bakrom → avdeling, and by name within a role.
      const seen = new Set<number>()
      const order: Record<ScreenRole, number> = { kunde: 0, bakrom: 1, avdeling: 2 }
      const screens = perGroup
        .flat()
        .filter((s) => (seen.has(s.displayId) ? false : (seen.add(s.displayId), true)))
        .sort((a, b) => order[a.role] - order[b.role] || a.roleLabel.localeCompare(b.roleLabel, "nb") || a.name.localeCompare(b.name, "nb"))
      result.set(store.id, screens)
    })
  )
  return result
}
