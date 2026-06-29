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

  // 1. News + ticker overlay (app-rendered webpage), full height.
  const newsPl = await addRegion(api, draftId, { width: 1340, height: 1000, top: 40, left: 40 })
  await addWebpage(api, newsPl, opts.newsUri, { transparency: 0 })

  // 2. Digital clock + date.
  const clockPl = await addRegion(api, draftId, { width: 480, height: 230, top: 40, left: 1400 })
  const clockWidget = await api(`/playlist/widget/clock-digital/${clockPl}`, { method: "POST" })
  await api(`/playlist/widget/${clockWidget.widgetId}`, {
    method: "PUT",
    form: { format: CLOCK_FORMAT, lang: "nb", duration: PERSIST_SECONDS, useDuration: 1 },
  })

  // 3. Yr weather (webpage), full height.
  const weatherPl = await addRegion(api, draftId, { width: 480, height: 740, top: 300, left: 1400 })
  await addWebpage(api, weatherPl, opts.weatherUri, { transparency: 1 })

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
