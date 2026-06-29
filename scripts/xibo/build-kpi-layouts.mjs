/**
 * Generates a STAFF-ONLY KPI dashboard layout per store and schedules it to a
 * dedicated back-room display group ("{butikk} – Bakrom"). These show operational
 * figures (omsetning/svinn/lønn) and must NEVER be placed on customer screens —
 * they live in their own display group, separate from the store's customer group.
 *
 * Run from repo root:  node scripts/xibo/build-kpi-layouts.mjs
 */

import { loadEnv, getToken, makeApi, kpiUri, buildFullscreenWebpage } from "./lib.mjs"

const ALWAYS_DAYPART_ID = 2
const LAYOUT_PREFIX = "Gange-Rolv KPI – "
const GROUP_SUFFIX = " – Bakrom"

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const token = await getToken(env)
const api = makeApi(env, token)

async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name&order=name`
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

async function findOrCreateGroup(name) {
  const groups = await api(`/displaygroup?length=500&isDisplaySpecific=0`)
  const found = groups.find((g) => g.displayGroup === name)
  if (found) return found.displayGroupId
  const created = await api(`/displaygroup`, { method: "POST", form: { displayGroup: name, description: "Ansatt/bakrom — KPI" } })
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
console.log(`→ Bygger ${stores.length} KPI-layouts + bakrom-grupper mot ${env.XIBO_API_URL}`)
let built = 0
let scheduled = 0
const bakromGroupIds = []

for (const store of stores) {
  const layoutName = `${LAYOUT_PREFIX}${store.name}`.slice(0, 50)
  const groupName = `${store.name}${GROUP_SUFFIX}`
  const groupId = await findOrCreateGroup(groupName)
  bakromGroupIds.push(groupId)
  const { layoutId, campaignId } = await findOrCreateLayout(layoutName)
  await buildFullscreenWebpage(api, layoutId, kpiUri(APP_URL, store.id))
  built++
  const did = await ensureSchedule(campaignId, groupId, existingEvents)
  if (did) scheduled++
  console.log(`  ✓ ${store.name} — KPI-layout (campaign ${campaignId}) → gruppe «${groupName}» (${groupId}) ${did ? "planlagt" : "alt planlagt"}`)
}

// All-stores overview — two periods (siste uke + hittil i år). Both roterer på
// sentral-skjermen «Gange-Rolv Bakrom» OG på hver butikks bakrom, så alle
// butikksjefer ser hvordan egen butikk ligger an mot resten av kjeden.
const ledelseGroupId = await findOrCreateGroup("Gange-Rolv Bakrom")
const overviewTargets = [...bakromGroupIds, ledelseGroupId]
const OVERVIEWS = [
  { name: "Gange-Rolv KPI – Alle butikker (uke)", uri: `${APP_URL}/widget/kpi-oversikt` },
  { name: "Gange-Rolv KPI – Alle butikker (år)", uri: `${APP_URL}/widget/kpi-oversikt?periode=ar` },
]
for (const ov of OVERVIEWS) {
  const { layoutId, campaignId } = await findOrCreateLayout(ov.name)
  await buildFullscreenWebpage(api, layoutId, ov.uri)
  let n = 0
  for (const gid of overviewTargets) {
    if (await ensureSchedule(campaignId, gid, existingEvents)) {
      n++
      scheduled++
    }
  }
  console.log(`  ✓ OVERSIKT «${ov.name}» (campaign ${campaignId}) → ${overviewTargets.length} grupper (alle bakrom + ledelse), ${n} nye`)
}

console.log(`\n✅ ${built} KPI-layouts + 2 oversikter (uke + år), ${scheduled} nye planlegginger.\n   Bakroms-Pi i «{butikk} – Bakrom» roterer: egen KPI → alle butikker (uke) → alle butikker (år).`)
