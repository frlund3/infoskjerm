/**
 * Enhets-styrt provisjonering: knytter en butikks kundeskjerm til en `screens`-rad
 * (token) og peker Xibo-layouten på /skjerm/<token>. Etterpå styres flate/avdeling
 * fra admin (butikk-detalj → Skjermer) UTEN å røre Xibo eller Pi-en igjen.
 *
 * Kjør fra repo-rot:
 *   node scripts/xibo/build-skjerm.mjs --store="Mobile Oslo"
 */

import {
  loadEnv, getToken, makeApi,
  findOrCreateLayout, buildPortraitCustomer, findDisplayGroupId,
  scheduleCampaignToGroup, PORTRAIT_RESOLUTION_ID,
} from "/Users/frlund3/Documents/GitHub/infoskjerm/scripts/xibo/lib.mjs"

function flag(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const storeName = flag("store")
if (!storeName) { console.error('Bruk: --store="<butikknavn>"'); process.exit(1) }

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm.framtidtech.no"
const SB = env.NEXT_PUBLIC_SUPABASE_URL
const SRK = env.SUPABASE_SERVICE_ROLE_KEY
const sbHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" }

// 1) Butikk
const sres = await fetch(`${SB}/rest/v1/stores?select=id,name,tenant_id&name=eq.${encodeURIComponent(storeName)}`, { headers: sbHeaders })
const store = (await sres.json())[0]
if (!store) throw new Error("Fant ikke butikk " + storeName)

// 2) screens-rad (kundeskjerm) — gjenbruk hvis finnes, ellers opprett med token
const existing = await (await fetch(`${SB}/rest/v1/screens?select=id,token&store_id=eq.${store.id}&flate=eq.kunde&limit=1`, { headers: sbHeaders })).json()
let token
if (existing[0]?.token) {
  token = existing[0].token
  console.log("Gjenbruker screens-rad:", existing[0].id)
} else {
  token = "sk_" + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("")
  const ins = await fetch(`${SB}/rest/v1/screens`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ store_id: store.id, tenant_id: store.tenant_id, name: `${store.name} kundeskjerm`, token, status: "active", flate: "kunde", avdeling: "felles", orientation: "portrait" }),
  })
  if (!ins.ok) throw new Error(`Kunne ikke opprette screens: ${ins.status} ${await ins.text()}`)
  console.log("Opprettet screens-rad med token")
}

// 3) Xibo: pek layouten på /skjerm/<token> (stående) + planlegg til butikkens gruppe
const skjermUri = `${APP_URL}/skjerm/${token}`
const api = makeApi(env, await getToken(env))
const { layoutId, campaignId } = await findOrCreateLayout(api, `Enhet – ${store.name}`, PORTRAIT_RESOLUTION_ID)
await buildPortraitCustomer(api, layoutId, { contentUri: skjermUri })
const dgId = await findDisplayGroupId(api, store.name)
if (!dgId) throw new Error(`Fant ingen skjermgruppe «${store.name}»`)
const sched = await scheduleCampaignToGroup(api, campaignId, dgId)
console.log(`✅ ${store.name} → ${skjermUri}\n   layout ${layoutId} → gruppe ${dgId}: ${sched}`)
console.log(`   Styr flate/avdeling/orientering i admin: butikk-detalj → Skjermer.`)
