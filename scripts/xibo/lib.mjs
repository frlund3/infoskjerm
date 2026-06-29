/**
 * Shared Xibo template builder for the Gange-Rolv signage layouts.
 *
 * Both the base template (campaign 8, all-stores) and the 16 per-store layouts
 * share the SAME four-zone design — only the ?store=/coordinates differ. All four
 * zones are now app-rendered webpages (full design control); Xibo just embeds and
 * schedules them.
 *
 *   ┌────────────────────────────┬──────────────┐
 *   │  News (/widget/nyheter)    │  Digital     │
 *   │  rich per-type cards,      │  clock+date  │
 *   │  poster/bg images, QR, KPI ├──────────────┤
 *   │                            │  Yr weather  │
 *   ├────────────────────────────┴──────────────┤
 *   │  Ticker (/widget/ticker — hidden if empty) │
 *   └────────────────────────────────────────────┘
 */

import { readFileSync } from "node:fs"

export const PERSIST_SECONDS = 900

export function loadEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
      })
  )
}

export async function getToken(env) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.XIBO_CLIENT_ID,
    client_secret: env.XIBO_CLIENT_SECRET,
  })
  const r = await fetch(`${env.XIBO_API_URL}/api/authorize/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token
}

export function makeApi(env, token) {
  return async function api(path, opts = {}) {
    const r = await fetch(`${env.XIBO_API_URL}/api${path}`, {
      method: opts.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: opts.form ? new URLSearchParams(opts.form) : undefined,
    })
    const text = await r.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    if (!r.ok) throw new Error(`${opts.method || "GET"} ${path} → ${r.status}: ${text.slice(0, 300)}`)
    return json
  }
}

const CLOCK_FORMAT = `<div style="font-family:Arial,Helvetica,sans-serif;text-align:center;color:#fff;line-height:1;"><div style="font-size:104px;font-weight:900;letter-spacing:-2px;">[HH:mm]</div><div style="font-size:30px;color:rgba(255,255,255,.6);margin-top:14px;text-transform:capitalize;">[dddd D. MMMM]</div></div>`

// ---------- widget URL helpers ----------
export function newsUri(appUrl, storeId) {
  return storeId ? `${appUrl}/widget/nyheter?store=${storeId}` : `${appUrl}/widget/nyheter`
}
export function weatherUri(appUrl, { lat, lon, navn }) {
  return `${appUrl}/widget/vaer?lat=${lat}&lon=${lon}&navn=${encodeURIComponent(navn)}`
}
export function tickerUri(appUrl, storeId) {
  return storeId ? `${appUrl}/widget/ticker?store=${storeId}` : `${appUrl}/widget/ticker`
}

async function addRegion(api, draftId, { width, height, top, left }) {
  const r = await api(`/region/${draftId}`, { method: "POST", form: { type: "frame", width, height, top, left } })
  return r.regionPlaylist.playlistId
}

async function addWebpage(api, playlistId, uri, { transparency }) {
  const w = await api(`/playlist/widget/webpage/${playlistId}`, { method: "POST" })
  await api(`/playlist/widget/${w.widgetId}`, {
    method: "PUT",
    form: { uri, transparency, modeid: "1", isPreNavigate: 1, duration: PERSIST_SECONDS, useDuration: 1 },
  })
}

async function getDraftId(api, layoutId) {
  const existing = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (Array.isArray(existing) && existing[0]) return existing[0].layoutId
  await api(`/layout/checkout/${layoutId}`, { method: "PUT" })
  const drafts = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (!drafts[0]) throw new Error("Fant ikke draft etter checkout")
  return drafts[0].layoutId
}

/**
 * (Re)builds the three-zone signage layout on the given published layout id.
 * The ticker is NOT a separate region — it is an overlay rendered inside the
 * news webpage, shown only when there are active ticker messages, so the news
 * fills the full height otherwise.
 * Idempotent: checks out, wipes regions, rebuilds, publishes.
 * opts: { newsUri, weatherUri }
 */
export async function buildLayout(api, layoutId, opts) {
  const draftId = await getDraftId(api, layoutId)
  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) {
    await api(`/region/${r.regionId}`, { method: "DELETE" })
  }

  // 1. Top strip (app webpage): store name + live clock + date + weather, full width.
  const barPl = await addRegion(api, draftId, { width: 1920, height: 180, top: 0, left: 0 })
  await addWebpage(api, barPl, opts.topbarUri, { transparency: 0 })

  // 2. News + ticker overlay (app webpage), full width below the strip.
  const newsPl = await addRegion(api, draftId, { width: 1920, height: 900, top: 180, left: 0 })
  await addWebpage(api, newsPl, opts.newsUri, { transparency: 0 })

  await api(`/layout/publish/${layoutId}`, { method: "PUT", form: { publishNow: 1 } })
}

/**
 * (Re)builds a single full-screen webpage layout (one region covering the whole
 * 1920×1080 canvas). Used for the staff KPI dashboard. Idempotent.
 */
export async function buildFullscreenWebpage(api, layoutId, uri) {
  const draftId = await getDraftId(api, layoutId)
  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) {
    await api(`/region/${r.regionId}`, { method: "DELETE" })
  }
  const pl = await addRegion(api, draftId, { width: 1920, height: 1080, top: 0, left: 0 })
  await addWebpage(api, pl, uri, { transparency: 0 })
  await api(`/layout/publish/${layoutId}`, { method: "PUT", form: { publishNow: 1 } })
}

export function kpiUri(appUrl, storeId) {
  return `${appUrl}/widget/butikk-kpi?store=${storeId}`
}

export function tilbudUri(appUrl, storeId) {
  return `${appUrl}/widget/tilbud?store=${storeId}`
}

export function topbarUri(appUrl, { butikk, lat, lon, navn }) {
  const p = new URLSearchParams({
    butikk: butikk ?? "",
    lat: String(lat ?? ""),
    lon: String(lon ?? ""),
    navn: navn ?? "",
  })
  return `${appUrl}/widget/topbar?${p.toString()}`
}

// ---------- generic special-widget provisioning ----------
//
// Lets a brand-new per-store page become a real screen with one call: build a
// full-screen layout that embeds any /widget/* URL, then schedule it onto one
// store's display group. This is how a store-specific "special module" ships —
// a React widget + this provisioning, no bespoke Xibo work each time.

export const ALWAYS_DAYPART_ID = 2

export const PORTRAIT_RESOLUTION_ID = 3 // 1080×1920

/** Find a published (parentId===null) layout by exact name, or create it. */
export async function findOrCreateLayout(api, name, resolutionId = 1) {
  const capped = name.slice(0, 50)
  const found = ((await api(`/layout?layout=${encodeURIComponent(capped)}&length=50`)) || []).find(
    (l) => l.layout === capped && l.parentId === null
  )
  if (found) return { layoutId: found.layoutId, campaignId: found.campaignId }
  const created = await api(`/layout`, { method: "POST", form: { name: capped, resolutionId } })
  const fresh = (await api(`/layout?layoutId=${created.layoutId}`))[0]
  return { layoutId: created.layoutId, campaignId: fresh.campaignId }
}

/**
 * (Re)builds a PORTRAIT customer layout (1080×1920): one full-screen region with
 * the offer/kundeavis content — no top strip (customers see only the offers).
 * The layout itself must have been created with PORTRAIT_RESOLUTION_ID.
 */
export async function buildPortraitCustomer(api, layoutId, { contentUri }) {
  const draftId = await getDraftId(api, layoutId)
  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) await api(`/region/${r.regionId}`, { method: "DELETE" })
  const pl = await addRegion(api, draftId, { width: 1080, height: 1920, top: 0, left: 0 })
  await addWebpage(api, pl, contentUri, { transparency: 0 })
  await api(`/layout/publish/${layoutId}`, { method: "PUT", form: { publishNow: 1 } })
}

/** Remove all schedule events for a campaign on a display group. Returns count. */
export async function unscheduleCampaignFromGroup(api, campaignId, displayGroupId) {
  const events = (await api(`/schedule?length=2000`)) || []
  let n = 0
  for (const e of events) {
    if (e.campaignId === campaignId && (e.displayGroups || []).some((g) => g.displayGroupId === displayGroupId)) {
      await api(`/schedule/${e.eventId}`, { method: "DELETE" })
      n++
    }
  }
  return n
}

/** displayGroupId for a real (non display-specific) group by exact name, or null. */
export async function findDisplayGroupId(api, name) {
  const groups = (await api(`/displaygroup?isDisplaySpecific=0&length=1000`)) || []
  const g = groups.find((x) => x.displayGroup === name)
  return g ? g.displayGroupId : null
}

/**
 * Schedule a campaign onto a display group if it isn't already. Idempotent.
 * dayPartId 2 = Always. Returns "scheduled" | "exists".
 */
export async function scheduleCampaignToGroup(api, campaignId, displayGroupId, opts = {}) {
  const events = (await api(`/schedule?length=2000`)) || []
  const exists = events.some(
    (e) => e.campaignId === campaignId && (e.displayGroups || []).some((g) => g.displayGroupId === displayGroupId)
  )
  if (exists) return "exists"
  await api(`/schedule`, {
    method: "POST",
    form: {
      eventTypeId: 1,
      campaignId,
      "displayGroupIds[]": displayGroupId,
      dayPartId: opts.dayPartId ?? ALWAYS_DAYPART_ID,
      syncTimezone: 0,
      isPriority: opts.isPriority ?? 0,
      displayOrder: 0,
      fromDt: opts.fromDt ?? "",
      toDt: opts.toDt ?? "",
    },
  })
  return "scheduled"
}

/**
 * One-call provisioning of a special full-screen widget page for a store: build
 * (or rebuild) a full-screen layout embedding `widgetUri`, then (unless
 * schedule===false) schedule it onto the store's display group.
 * opts: { layoutName, widgetUri, displayGroupName, dayPartId?, schedule? }
 */
export async function provisionWidgetLayout(api, opts) {
  const { layoutName, widgetUri, displayGroupName, dayPartId, schedule = true } = opts
  const { layoutId, campaignId } = await findOrCreateLayout(api, layoutName)
  await buildFullscreenWebpage(api, layoutId, widgetUri)
  let scheduling = "skipped"
  if (schedule && displayGroupName) {
    const dgId = await findDisplayGroupId(api, displayGroupName)
    if (!dgId) throw new Error(`Fant ingen skjermgruppe «${displayGroupName}» i Xibo`)
    scheduling = await scheduleCampaignToGroup(api, campaignId, dgId, { dayPartId })
  }
  return { layoutId, campaignId, scheduling }
}
