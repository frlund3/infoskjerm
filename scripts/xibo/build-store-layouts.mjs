/**
 * Generates one per-store Xibo layout for each of the 16 Gange-Rolv stores and
 * schedules it to that store's display group. Each store layout shares the base
 * four-zone design but with:
 *   - weather on the store's own coordinates,
 *   - the news zone filtered to rows targeting that store (or "ALLE") within the
 *     valid date window.
 *
 * Idempotent: re-running finds existing layouts/schedules by name/campaign and
 * rebuilds/skips instead of duplicating.
 *
 * Run from repo root:  node scripts/xibo/build-store-layouts.mjs
 * Reads XIBO_*, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { loadEnv, getToken, makeApi, newsUri, weatherUri, buildLayout } from "./lib.mjs"

const ALWAYS_DAYPART_ID = 2
const NAME_PREFIX = "Gange-Rolv – "

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const token = await getToken(env)
const api = makeApi(env, token)

// ---------- stores from Supabase ----------
async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name,latitude,longitude,city&order=name`
  const r = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

// ---------- layout find-or-create (returns stable campaignId) ----------
async function findOrCreateLayout(name) {
  const found = (await api(`/layout?layout=${encodeURIComponent(name)}&length=50`)).find(
    (l) => l.layout === name && l.parentId === null
  )
  if (found) return { layoutId: found.layoutId, campaignId: found.campaignId }
  const created = await api(`/layout`, { method: "POST", form: { name: name.slice(0, 50), resolutionId: 1 } })
  // Re-read to get the stable campaignId.
  const fresh = (await api(`/layout?layoutId=${created.layoutId}`))[0]
  return { layoutId: created.layoutId, campaignId: fresh.campaignId }
}

// ---------- scheduling ----------
async function ensureSchedule(campaignId, displayGroupId, existingEvents) {
  const already = existingEvents.some(
    (e) => e.campaignId === campaignId && (e.displayGroups || []).some((g) => g.displayGroupId === displayGroupId)
  )
  if (already) return false
  await api(`/schedule`, {
    method: "POST",
    form: {
      eventTypeId: 1,
      campaignId,
      "displayGroupIds[]": [displayGroupId],
      dayPartId: ALWAYS_DAYPART_ID,
      syncTimezone: 0,
      isPriority: 0,
      displayOrder: 0,
      fromDt: "",
      toDt: "",
    },
  })
  return true
}

// ---------- main ----------
const stores = await fetchStores()
const displayGroups = await api(`/displaygroup?length=200&isDisplaySpecific=0`)
const dgByName = new Map(displayGroups.map((g) => [g.displayGroup, g.displayGroupId]))
const existingEvents = (await api(`/schedule?length=2000`)) || []

console.log(`→ Bygger ${stores.length} butikk-layouts mot ${env.XIBO_API_URL}`)
let built = 0
let scheduled = 0

for (const store of stores) {
  const name = `${NAME_PREFIX}${store.name}`
  const dgId = dgByName.get(store.name)
  const lat = store.latitude ?? 62.4722
  const lon = store.longitude ?? 6.1495

  const { layoutId, campaignId } = await findOrCreateLayout(name)
  await buildLayout(api, layoutId, {
    newsUri: newsUri(APP_URL, store.id),
    weatherUri: weatherUri(APP_URL, { lat, lon, navn: store.city || store.name }),
  })
  built++

  let schedMsg = "ingen display-gruppe funnet"
  if (dgId) {
    const did = await ensureSchedule(campaignId, dgId, existingEvents)
    if (did) scheduled++
    schedMsg = did ? `planlagt → gruppe ${dgId}` : `allerede planlagt (gruppe ${dgId})`
  }
  console.log(`  ✓ ${store.name} (campaign ${campaignId}) — ${schedMsg}`)
}

console.log(`\n✅ ${built} layouts bygget, ${scheduled} nye planlegginger. Per-butikk-forhåndsvisning via /campaign/{id}/preview.`)
