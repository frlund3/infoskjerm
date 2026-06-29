/**
 * Generic per-store special-widget provisioner.
 *
 * Turns any /widget/* page into a real screen for one store: builds a
 * full-screen Xibo layout embedding the widget and schedules it onto the
 * store's display group. This is the "a store needs a special page/module"
 * path — write a React widget, then run this. No bespoke Xibo work each time.
 *
 * The store's id is looked up by name and appended as ?store=<id> so a widget
 * can filter its content per store, exactly like the news/offer widgets do.
 *
 * Examples (run from repo root):
 *   node scripts/xibo/build-widget-layout.mjs \
 *     --widget=/widget/info --store="Moa" --name="Gange-Rolv Info – Moa"
 *
 *   # lunch menu only 10–14 via a custom Xibo daypart id 5, no auto-schedule:
 *   node scripts/xibo/build-widget-layout.mjs \
 *     --widget=/widget/lunsj --store="Spjelkavik" \
 *     --name="Lunsj – Spjelkavik" --daypart=5
 *
 *   # bakrom dashboard onto the staff group, custom extra query:
 *   node scripts/xibo/build-widget-layout.mjs \
 *     --widget=/widget/butikk-kpi --store="Moa – Bakrom" \
 *     --name="KPI – Moa Bakrom" --query="periode=ar"
 */

import { loadEnv, getToken, makeApi, provisionWidgetLayout } from "./lib.mjs"

function flag(name, def = undefined) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const hasFlag = (name) => process.argv.includes(`--${name}`)

const widget = flag("widget")
const storeName = flag("store")
const layoutName = flag("name")
const dayPartId = flag("daypart") ? Number(flag("daypart")) : undefined
const extraQuery = flag("query", "")
const noSchedule = hasFlag("no-schedule")

if (!widget || !storeName || !layoutName) {
  console.error(
    'Bruk: node scripts/xibo/build-widget-layout.mjs --widget=/widget/<navn> --store="<butikk/gruppe>" --name="<layoutnavn>" [--daypart=<id>] [--query=foo=bar] [--no-schedule]'
  )
  process.exit(1)
}

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const token = await getToken(env)
const api = makeApi(env, token)

/** Look up a store id by exact name so ?store= can be appended (null if no match). */
async function storeIdByName(name) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name&name=eq.${encodeURIComponent(name)}`
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  const rows = await r.json()
  return rows[0]?.id ?? null
}

const storeId = await storeIdByName(storeName)
const params = new URLSearchParams()
if (storeId) params.set("store", storeId)
if (extraQuery) {
  for (const part of extraQuery.split("&")) {
    const i = part.indexOf("=")
    if (i > 0) params.set(part.slice(0, i), part.slice(i + 1))
  }
}
const qs = params.toString()
const widgetUri = `${APP_URL}${widget}${qs ? `${widget.includes("?") ? "&" : "?"}${qs}` : ""}`

console.log(
  `→ Provisjonerer «${layoutName}»\n   widget: ${widgetUri}\n   skjermgruppe: ${storeName}${noSchedule ? " (bygges, ikke planlagt)" : ""}`
)
const res = await provisionWidgetLayout(api, {
  layoutName,
  widgetUri,
  displayGroupName: storeName,
  dayPartId,
  schedule: !noSchedule,
})
console.log(`✅ layout ${res.layoutId} (campaign ${res.campaignId}) — planlegging: ${res.scheduling}`)
