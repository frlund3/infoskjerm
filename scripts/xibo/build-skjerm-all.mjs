/**
 * Provisjonerer ALLE enheter i en tenant til den enhets-styrte modellen:
 * for hver butikk/forhandler opprettes en kundeskjerm OG en internskjerm som
 * screens-rad (token), Xibo-layoutene peker på /skjerm/<token>, og planlegges
 * til hhv. «{navn}» (stående) og «{navn} – Bakrom» (liggende). Idempotent.
 *
 * Etterpå styres flate/avdeling/orientering fra admin — Xibo/Pi rører vi ikke igjen.
 *
 * Kjør fra repo-rot:  node scripts/xibo/build-skjerm-all.mjs --tenant=<tenant_id>
 */

import {
  loadEnv, getToken, makeApi,
  findOrCreateLayout, buildPortraitCustomer, buildFullscreenWebpage,
  findDisplayGroupId, scheduleCampaignToGroup, PORTRAIT_RESOLUTION_ID,
} from "/Users/frlund3/Documents/GitHub/infoskjerm/scripts/xibo/lib.mjs"

const tenant = (process.argv.find((a) => a.startsWith("--tenant=")) || "").split("=")[1]
if (!tenant) { console.error("Bruk: --tenant=<tenant_id>"); process.exit(1) }

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm.framtidtech.no"
const SB = env.NEXT_PUBLIC_SUPABASE_URL
const SRK = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" }
const api = makeApi(env, await getToken(env))

function newToken() {
  return "sk_" + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("")
}
async function ensureGroup(name, desc) {
  let id = await findDisplayGroupId(api, name)
  if (!id) { id = (await api(`/displaygroup`, { method: "POST", form: { displayGroup: name, description: desc, isDynamic: 0 } })).displayGroupId }
  return id
}
/** Avplanlegg ALT fra gruppa unntatt gitt campaign (så kun /skjerm-layouten spilles). */
async function clearGroupExcept(groupId, keepCampaignId) {
  const events = (await api(`/schedule?length=2000`)) || []
  for (const e of events) {
    if (e.campaignId !== keepCampaignId && (e.displayGroups || []).some((g) => g.displayGroupId === groupId)) {
      await api(`/schedule/${e.eventId}`, { method: "DELETE" })
    }
  }
}
async function ensureScreenRow(store, flate, orientation) {
  const q = `${SB}/rest/v1/screens?select=id,token&store_id=eq.${store.id}&flate=eq.${flate}&limit=1`
  const found = (await (await fetch(q, { headers: H })).json())[0]
  if (found?.token) return found.token
  const token = newToken()
  const ins = await fetch(`${SB}/rest/v1/screens`, {
    method: "POST", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ store_id: store.id, tenant_id: store.tenant_id, name: `${store.name} ${flate}`, token, status: "active", flate, avdeling: "felles", orientation }),
  })
  if (!ins.ok) throw new Error(`screens ${flate} ${store.name}: ${ins.status} ${await ins.text()}`)
  return token
}

const stores = await (await fetch(`${SB}/rest/v1/stores?select=id,name,tenant_id&tenant_id=eq.${tenant}&order=name`, { headers: H })).json()
console.log(`→ Provisjonerer ${stores.length} enheter (kunde + intern) til /skjerm-modellen`)

for (const s of stores) {
  // Kundeskjerm (stående)
  const kToken = await ensureScreenRow(s, "kunde", "portrait")
  const kGroup = await ensureGroup(s.name, "Kundeskjerm")
  const kL = await findOrCreateLayout(api, `Enhet – ${s.name}`, PORTRAIT_RESOLUTION_ID)
  await buildPortraitCustomer(api, kL.layoutId, { contentUri: `${APP_URL}/skjerm/${kToken}` })
  await scheduleCampaignToGroup(api, kL.campaignId, kGroup)
  await clearGroupExcept(kGroup, kL.campaignId)

  // Internskjerm (liggende)
  const iToken = await ensureScreenRow(s, "intern", "landscape")
  const iGroup = await ensureGroup(`${s.name} – Bakrom`, "Intern skjerm")
  const iL = await findOrCreateLayout(api, `Enhet intern – ${s.name}`.slice(0, 50), 1)
  await buildFullscreenWebpage(api, iL.layoutId, `${APP_URL}/skjerm/${iToken}`, 20)
  await scheduleCampaignToGroup(api, iL.campaignId, iGroup)
  await clearGroupExcept(iGroup, iL.campaignId)

  console.log(`  ✓ ${s.name} — kunde+intern → /skjerm`)
}
console.log(`\n✅ Ferdig. Alle enheter er enhets-styrte. Styr i admin: butikk-detalj → Skjermer.`)
