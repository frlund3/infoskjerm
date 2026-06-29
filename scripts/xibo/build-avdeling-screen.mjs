/**
 * Creates a PORTRAIT department customer screen for ONE store + department.
 * Use this when a store actually gets a screen for a specific department
 * (frukt, ferskvare, …) that should show only that department's offers + the
 * whole-store ("felles") offers.
 *
 * It creates a portrait layout embedding /widget/tilbud?store=X&avdeling=Y and a
 * display group "{store} – {Avdeling}" scheduled to it. In Xibo, assign the
 * department's Raspberry Pi to that display group — and it shows that department.
 *
 * Run:  node scripts/xibo/build-avdeling-screen.mjs "EUROSPAR MOA" frukt
 */

import {
  loadEnv, getToken, makeApi, tilbudUri,
  findOrCreateLayout, buildPortraitCustomer, scheduleCampaignToGroup, PORTRAIT_RESOLUTION_ID,
} from "./lib.mjs"

const AVDELINGER = {
  frukt: "Frukt & grønt", ferskvare: "Ferskvare", frys: "Frys", bakeri: "Bakeri",
  "kjott-fisk": "Kjøtt & fisk", kasse: "Kasse", inngang: "Inngang",
}

const [storeName, avdeling] = process.argv.slice(2)
if (!storeName || !avdeling || !AVDELINGER[avdeling]) {
  console.error(`Bruk: node scripts/xibo/build-avdeling-screen.mjs "BUTIKKNAVN" <avdeling>`)
  console.error(`Avdelinger: ${Object.keys(AVDELINGER).join(", ")}`)
  process.exit(1)
}

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const api = makeApi(env, await getToken(env))

async function fetchStore(name) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name&name=eq.${encodeURIComponent(name)}`
  const r = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  const rows = await r.json()
  return rows[0]
}

async function findOrCreateGroup(name) {
  const groups = (await api(`/displaygroup?isDisplaySpecific=0&length=1000`)) || []
  const found = groups.find((g) => g.displayGroup === name)
  if (found) return found.displayGroupId
  const created = await api(`/displaygroup`, { method: "POST", form: { displayGroup: name, description: "Kunde — avdelingsskjerm" } })
  return created.displayGroupId
}

const store = await fetchStore(storeName)
if (!store) {
  console.error(`Fant ikke butikk «${storeName}»`)
  process.exit(1)
}

const label = AVDELINGER[avdeling]
const layoutName = `Gange-Rolv Kunde – ${store.name} – ${label}`
const groupName = `${store.name} – ${label}`

const { layoutId, campaignId } = await findOrCreateLayout(api, layoutName, PORTRAIT_RESOLUTION_ID)
await buildPortraitCustomer(api, layoutId, { contentUri: `${tilbudUri(APP_URL, store.id)}&avdeling=${avdeling}` })
const groupId = await findOrCreateGroup(groupName)
const did = await scheduleCampaignToGroup(api, campaignId, groupId)

console.log(`✅ ${store.name} / ${label}`)
console.log(`   Layout «${layoutName}» (campaign ${campaignId}) ${did} → gruppe «${groupName}» (${groupId})`)
console.log(`   Neste steg i Xibo: tilordne avdelingens Raspberry Pi til gruppen «${groupName}».`)
