/**
 * Builds the INTERNAL back-room ("bakrom") landscape layout per store and
 * schedules it to that store's "{butikk} – Bakrom" display group — alongside the
 * KPI layouts. Each layout mirrors the in-app internal preview exactly:
 *   - top strip (store name + clock + date + weather), full width
 *   - internal news + ticker below (flate=intern → staff content, never customer)
 *
 * So a bakrom Pi rotates: internal news (topbar + ticker) → own KPI → all-stores
 * overviews. Customer-facing content is never placed here.
 *
 * Idempotent: finds existing layouts/schedules by name/campaign and rebuilds/
 * skips instead of duplicating.
 *
 * Run from repo root:  node scripts/xibo/build-internal-bakrom.mjs
 * Reads XIBO_*, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { loadEnv, getToken, makeApi, topbarUri, buildLayout } from "./lib.mjs"

const ALWAYS_DAYPART_ID = 2
const NAME_PREFIX = "Gange-Rolv Internt – "
const GROUP_SUFFIX = " – Bakrom"

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const api = makeApi(env, await getToken(env))

const internNewsUri = (storeId) => `${APP_URL}/widget/nyheter?store=${storeId}&flate=intern`

async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name,latitude,longitude,city&order=name`
  const r = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

async function findOrCreateGroup(name) {
  const groups = await api(`/displaygroup?length=500&isDisplaySpecific=0`)
  const found = groups.find((g) => g.displayGroup === name)
  if (found) return found.displayGroupId
  const created = await api(`/displaygroup`, { method: "POST", form: { displayGroup: name, description: "Ansatt/bakrom — internt innhold" } })
  return created.displayGroupId
}

async function findOrCreateLayout(name) {
  const found = (await api(`/layout?layout=${encodeURIComponent(name)}&length=50`)).find((l) => l.layout === name && l.parentId === null)
  if (found) return { layoutId: found.layoutId, campaignId: found.campaignId }
  const created = await api(`/layout`, { method: "POST", form: { name: name.slice(0, 50), resolutionId: 1 } })
  const fresh = (await api(`/layout?layoutId=${created.layoutId}`))[0]
  return { layoutId: created.layoutId, campaignId: fresh.campaignId }
}

async function ensureSchedule(campaignId, displayGroupId, existingEvents) {
  const already = existingEvents.some((e) => e.campaignId === campaignId && (e.displayGroups || []).some((g) => g.displayGroupId === displayGroupId))
  if (already) return false
  await api(`/schedule`, {
    method: "POST",
    form: { eventTypeId: 1, campaignId, "displayGroupIds[]": [displayGroupId], dayPartId: ALWAYS_DAYPART_ID, syncTimezone: 0, isPriority: 0, displayOrder: 0, fromDt: "", toDt: "" },
  })
  return true
}

const stores = await fetchStores()
const existingEvents = (await api(`/schedule?length=2000`)) || []
console.log(`→ Bygger ${stores.length} interne bakrom-layouts mot ${env.XIBO_API_URL}`)
let built = 0
let scheduled = 0

for (const store of stores) {
  const name = `${NAME_PREFIX}${store.name}`.slice(0, 50)
  const lat = store.latitude ?? 62.4722
  const lon = store.longitude ?? 6.1495
  const groupId = await findOrCreateGroup(`${store.name}${GROUP_SUFFIX}`)

  const { layoutId, campaignId } = await findOrCreateLayout(name)
  await buildLayout(api, layoutId, {
    topbarUri: topbarUri(APP_URL, { butikk: store.name, lat, lon, navn: store.city || store.name }),
    newsUri: internNewsUri(store.id),
  })
  built++

  const did = await ensureSchedule(campaignId, groupId, existingEvents)
  if (did) scheduled++
  console.log(`  ✓ ${store.name} (campaign ${campaignId}) → «${store.name}${GROUP_SUFFIX}» ${did ? "planlagt" : "alt planlagt"}`)
}

console.log(`\n✅ ${built} interne bakrom-layouts, ${scheduled} nye planlegginger.\n   Bakrom-Pi i «{butikk} – Bakrom» roterer nå: internt innhold (topbar+ticker) → KPI → alle butikker.`)
