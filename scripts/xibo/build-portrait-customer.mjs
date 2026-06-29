/**
 * Builds the PORTRAIT customer layout per store (1080×1920): a top strip
 * (store name + clock + weather) over the offer/kundeavis content
 * (/widget/tilbud?store=). Customer screens are always portrait.
 *
 * This replaces the old landscape model: it schedules the portrait layout onto
 * the store's customer display group and UNschedules the old landscape store
 * layout ("Gange-Rolv – {store}") and the separate dynamic tilbud layout
 * ("Gange-Rolv Tilbud – {store}") — offers now live inside the portrait layout.
 *
 * Run from repo root:  node scripts/xibo/build-portrait-customer.mjs
 */

import {
  loadEnv, getToken, makeApi, tilbudUri,
  findOrCreateLayout, buildPortraitCustomer, findDisplayGroupId,
  scheduleCampaignToGroup, unscheduleCampaignFromGroup, PORTRAIT_RESOLUTION_ID,
} from "./lib.mjs"

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const api = makeApi(env, await getToken(env))

async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name,latitude,longitude,city&order=name`
  const r = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

async function campaignIdForLayout(name) {
  const capped = name.slice(0, 50)
  const found = ((await api(`/layout?layout=${encodeURIComponent(capped)}&length=50`)) || []).find((l) => l.layout === capped && l.parentId === null)
  return found ? found.campaignId : null
}

const stores = await fetchStores()
console.log(`→ Bygger ${stores.length} portrett-kundeskjermer (1080×1920) mot ${env.XIBO_API_URL}`)

for (const store of stores) {
  const lat = store.latitude ?? 62.4722
  const lon = store.longitude ?? 6.1495
  const layoutName = `Gange-Rolv Kunde – ${store.name}`

  const { layoutId, campaignId } = await findOrCreateLayout(api, layoutName, PORTRAIT_RESOLUTION_ID)
  await buildPortraitCustomer(api, layoutId, { contentUri: tilbudUri(APP_URL, store.id) })

  const dgId = await findDisplayGroupId(api, store.name)
  let msg = "ingen display-gruppe"
  if (dgId) {
    const did = await scheduleCampaignToGroup(api, campaignId, dgId)
    // Retire the old landscape layouts from the customer group.
    const oldStore = await campaignIdForLayout(`Gange-Rolv – ${store.name}`)
    const oldTilbud = await campaignIdForLayout(`Gange-Rolv Tilbud – ${store.name}`)
    let removed = 0
    if (oldStore) removed += await unscheduleCampaignFromGroup(api, oldStore, dgId)
    if (oldTilbud) removed += await unscheduleCampaignFromGroup(api, oldTilbud, dgId)
    msg = `${did} → gruppe ${dgId}, fjernet ${removed} gamle planlegginger`
  }
  console.log(`  ✓ ${store.name} — portrett (campaign ${campaignId}) ${msg}`)
}

console.log(`\n✅ Ferdig. Kundeskjermene er stående og viser toppstripe + tilbud/kundeavis.`)
