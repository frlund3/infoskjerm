import { xiboFetch, fetchLayoutNames, type XiboDisplay } from "./client"

/**
 * Real screens per store, read live from the screen engine (Xibo). A store's
 * customer screens are the displays assigned to its display group (the group
 * named exactly after the store). Read-only — CMS users see status here but
 * never log into Xibo. Returns an empty map if the engine is unreachable, so an
 * admin page never crashes on a screen-engine hiccup.
 */

export type ScreenSync = "ok" | "downloading" | "stale" | "unknown"

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
  /** The store's display group — target for a "collect now" push. */
  displayGroupId: number
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
  const groupIdByName = new Map((groups ?? []).map((g) => [g.displayGroup, g.displayGroupId]))

  await Promise.all(
    stores.map(async (store) => {
      const gid = groupIdByName.get(store.name)
      if (!gid) {
        result.set(store.id, [])
        return
      }
      try {
        const displays = await xiboFetch<XiboDisplay[]>("/display", {
          query: { displayGroupId: gid, length: 1000 },
        })
        result.set(
          store.id,
          (displays ?? [])
            .map((d) => ({
              displayId: d.displayId,
              name: d.display,
              online: d.loggedIn === 1,
              lastSeen: parseLastSeen(d.lastAccessed),
              sync: syncFrom(d.mediaInventoryStatus),
              currentLayout: d.currentLayoutId ? layoutNames.get(d.currentLayoutId) ?? null : null,
              clientVersion: d.clientVersion ?? null,
              displayGroupId: gid,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "nb"))
        )
      } catch {
        result.set(store.id, [])
      }
    })
  )
  return result
}
