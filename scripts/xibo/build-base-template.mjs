/**
 * Rebuilds the Gange-Rolv BASE template (Xibo campaign 8) — the all-stores
 * fallback layout. News/ticker show the all-stores feed; weather defaults to Ålesund.
 *
 * Run from repo root:  node scripts/xibo/build-base-template.mjs
 */

import { loadEnv, getToken, makeApi, newsUri, weatherUri, buildLayout } from "./lib.mjs"

const BASE_CAMPAIGN_ID = 8
const WEATHER = { lat: "62.4722", lon: "6.1495", navn: "Ålesund" }

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const token = await getToken(env)
const api = makeApi(env, token)

const layouts = await api(`/layout?length=200`)
const live = layouts.find((l) => l.campaignId === BASE_CAMPAIGN_ID && l.parentId === null)
if (!live) throw new Error(`Fant ingen publisert layout for campaign ${BASE_CAMPAIGN_ID}`)

console.log(`→ Bygger base-mal (campaign ${BASE_CAMPAIGN_ID}, layout ${live.layoutId})`)
await buildLayout(api, live.layoutId, {
  newsUri: newsUri(APP_URL, null),
  weatherUri: weatherUri(APP_URL, WEATHER),
})
console.log(`✅ Publisert. Forhåndsvis: ${env.XIBO_API_URL}/campaign/${BASE_CAMPAIGN_ID}/preview`)
