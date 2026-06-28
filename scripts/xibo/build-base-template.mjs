/**
 * Rebuilds the Gange-Rolv base template (Xibo campaign 8) as the DYNAMIC signage
 * template. Idempotent: resolves the current layout id from the campaign (Xibo
 * changes layout ids on publish), checks it out, wipes its regions, rebuilds four
 * zones, and publishes.
 *
 *   ┌────────────────────────────┬──────────────┐
 *   │  News (DataSet View,       │  Digital     │
 *   │  rotates + autoscroll long │  clock+date  │
 *   │  text)                     ├──────────────┤
 *   │                            │  Yr weather  │
 *   │                            │  (webpage)   │
 *   ├────────────────────────────┴──────────────┤
 *   │  Ticker (scrolling + red pulse)            │
 *   └────────────────────────────────────────────┘
 *
 * Run from the repo root:  node scripts/xibo/build-base-template.mjs
 * Reads XIBO_* and NEXT_PUBLIC_APP_URL from .env.local.
 * Property names verified live against Xibo 4.4.4.
 */

import { readFileSync } from "node:fs"

// ---------- config ----------
// The base template is addressed by its CAMPAIGN id (stable). Xibo changes the
// layout id on every publish, so we resolve the current layout id from it.
const BASE_CAMPAIGN_ID = 8
const NEWS_DATASET_ID = 1
const PER_ITEM_SECONDS = 20
// Long-lived zones (clock/weather/ticker) get a long duration so the player does
// not cycle/blank them mid-view; the shorter news region loops within.
const PERSIST_SECONDS = 900
// Max news items in the rotation. Xibo requires numItems > 1 with per-item duration.
const MAX_NEWS_ITEMS = 50
const WEATHER = { lat: "62.4722", lon: "6.1495", navn: "Ålesund" }
const TICKER_TEXT = "Velkommen til Gange-Rolv · Husk medlemsfordeler i kassen · God handel!"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
    })
)
const BASE = env.XIBO_API_URL
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"

// ---------- api helpers ----------
async function getToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.XIBO_CLIENT_ID,
    client_secret: env.XIBO_CLIENT_SECRET,
  })
  const r = await fetch(`${BASE}/api/authorize/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token
}

let TOKEN
async function api(path, opts = {}) {
  const r = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
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

// ---------- zone content ----------
const NEWS_TEMPLATE = `<div class="gr-news"><div class="gr-bg" style="background-image:url('[bilde]')"></div><div class="gr-body"><p class="gr-kicker">Gange-Rolv</p><h1 class="gr-title">[tittel]</h1><div class="gr-textwrap"><div class="gr-text">[tekst]</div></div></div></div>`

const NEWS_STYLES = `
.gr-news{position:relative;width:1340px;height:860px;overflow:hidden;background:linear-gradient(135deg,#0a0a0a,#161616);font-family:Arial,Helvetica,sans-serif;color:#fff;}
.gr-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.22;}
.gr-body{position:absolute;inset:0;padding:70px;box-sizing:border-box;display:flex;flex-direction:column;}
.gr-kicker{color:#16a34a;font-weight:bold;letter-spacing:4px;font-size:26px;margin:0 0 20px;text-transform:uppercase;flex:0 0 auto;}
.gr-title{font-size:78px;font-weight:900;margin:0 0 28px;line-height:1.03;flex:0 0 auto;}
.gr-textwrap{position:relative;flex:1 1 auto;overflow:hidden;}
.gr-text{font-size:36px;line-height:1.5;color:rgba(255,255,255,.88);white-space:pre-line;}
`.trim()

// Autoscrolls any news item whose text overflows its zone (slow down-then-back loop).
const NEWS_JS = `(function(){function go(){var ws=document.querySelectorAll('.gr-textwrap');if(!ws.length){return setTimeout(go,300);}var st=document.createElement('style');document.head.appendChild(st);ws.forEach(function(w,i){var tx=w.querySelector('.gr-text');if(!tx)return;var over=tx.scrollHeight-w.clientHeight;if(over>8){var n='grsc'+i;var dur=Math.max(10,Math.round(over/35)+6);try{st.sheet.insertRule('@keyframes '+n+'{0%,12%{transform:translateY(0)}88%,100%{transform:translateY(-'+over+'px)}}',0);tx.style.animation=n+' '+dur+'s ease-in-out infinite alternate';}catch(e){}}});}go();})();`

const NO_DATA = `<div style="display:flex;align-items:center;justify-content:center;width:1340px;height:860px;background:linear-gradient(135deg,#0a0a0a,#161616);color:rgba(255,255,255,.4);font-family:Arial;font-size:34px;">Ingen publiserte nyheter</div>`

const CLOCK_FORMAT = `<div style="font-family:Arial,Helvetica,sans-serif;text-align:center;color:#fff;line-height:1;"><div style="font-size:104px;font-weight:900;letter-spacing:-2px;">[HH:mm]</div><div style="font-size:30px;color:rgba(255,255,255,.6);margin-top:14px;text-transform:capitalize;">[dddd D. MMMM]</div></div>`

// Real ticker: pulsing red "NYTT" indicator + horizontally scrolling text.
const TICKER_HTML = `<div style="display:flex;align-items:center;height:120px;width:1840px;background:#16a34a;font-family:Arial,Helvetica,sans-serif;overflow:hidden;box-sizing:border-box;"><div style="display:flex;align-items:center;gap:16px;padding:0 34px;flex:0 0 auto;z-index:2;background:#16a34a;height:120px;"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#ef4444;animation:grpulse 1.4s ease-out infinite;"></span><span style="color:#fff;font-weight:900;font-size:30px;letter-spacing:3px;">NYTT</span></div><div style="flex:1 1 auto;overflow:hidden;position:relative;height:120px;"><div style="position:absolute;top:0;left:0;height:120px;display:flex;align-items:center;white-space:nowrap;color:#fff;font-size:34px;font-weight:600;padding-left:1640px;animation:grticker 28s linear infinite;">${TICKER_TEXT}</div></div></div><style>@keyframes grpulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.75)}70%{box-shadow:0 0 0 26px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}@keyframes grticker{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}</style>`

const WEATHER_URI = `${APP_URL}/widget/vaer?lat=${WEATHER.lat}&lon=${WEATHER.lon}&navn=${encodeURIComponent(WEATHER.navn)}`

// ---------- build ----------
async function resolveLayoutId() {
  const layouts = await api(`/layout?length=200`)
  const live = layouts.find((l) => l.campaignId === BASE_CAMPAIGN_ID && l.parentId === null)
  if (!live) throw new Error(`Fant ingen publisert layout for campaign ${BASE_CAMPAIGN_ID}`)
  return live.layoutId
}

async function getDraftId(layoutId) {
  const existing = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (Array.isArray(existing) && existing[0]) return existing[0].layoutId
  await api(`/layout/checkout/${layoutId}`, { method: "PUT" })
  const drafts = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (!drafts[0]) throw new Error("Fant ikke draft etter checkout")
  return drafts[0].layoutId
}

async function addRegion(draftId, { width, height, top, left }) {
  const r = await api(`/region/${draftId}`, { method: "POST", form: { type: "frame", width, height, top, left } })
  return r.regionPlaylist.playlistId
}

async function main() {
  TOKEN = await getToken()
  const layoutId = await resolveLayoutId()
  console.log(`→ Bygger base-mal (campaign ${BASE_CAMPAIGN_ID}, layout ${layoutId}) mot ${BASE}`)

  const draftId = await getDraftId(layoutId)
  console.log(`  draft = ${draftId}`)

  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) {
    await api(`/region/${r.regionId}`, { method: "DELETE" })
  }
  console.log(`  slettet ${(draft.regions || []).length} gamle regioner`)

  // 1. News — DataSet View, rotates through DataSet 1, one item per page, autoscroll.
  const newsPl = await addRegion(draftId, { width: 1340, height: 860, top: 40, left: 40 })
  const newsWidget = await api(`/playlist/widget/dataset/${newsPl}`, {
    method: "POST",
    form: { dataSetId: NEWS_DATASET_ID, templateId: "dataset_custom_html" },
  })
  await api(`/playlist/widget/${newsWidget.widgetId}`, {
    method: "PUT",
    form: {
      dataSetId: NEWS_DATASET_ID,
      templateId: "dataset_custom_html",
      duration: PER_ITEM_SECONDS,
      useDuration: 1,
      durationIsPerItem: 1,
      itemsPerPage: 1,
      numItems: MAX_NEWS_ITEMS,
      lowerLimit: 0,
      upperLimit: 0,
      effect: "fade",
      speed: 1000,
      template: NEWS_TEMPLATE,
      styleSheet: NEWS_STYLES,
      javaScript: NEWS_JS,
      noDataMessage: NO_DATA,
    },
  })
  console.log("  ✓ nyhets-sone (DataSet View + autoscroll)")

  // 2. Digital clock + date (small, top-right).
  const clockPl = await addRegion(draftId, { width: 480, height: 230, top: 40, left: 1400 })
  const clockWidget = await api(`/playlist/widget/clock-digital/${clockPl}`, { method: "POST" })
  await api(`/playlist/widget/${clockWidget.widgetId}`, {
    method: "PUT",
    form: { format: CLOCK_FORMAT, lang: "nb", duration: PERSIST_SECONDS, useDuration: 1 },
  })
  console.log("  ✓ digital klokke + dato")

  // 3. Yr weather (webpage embedding the app widget). Preload + long duration so
  //    it never blanks on cycle.
  const weatherPl = await addRegion(draftId, { width: 480, height: 590, top: 310, left: 1400 })
  const weatherWidget = await api(`/playlist/widget/webpage/${weatherPl}`, { method: "POST" })
  await api(`/playlist/widget/${weatherWidget.widgetId}`, {
    method: "PUT",
    form: { uri: WEATHER_URI, transparency: 1, modeid: "1", isPreNavigate: 1, duration: PERSIST_SECONDS, useDuration: 1 },
  })
  console.log(`  ✓ vær (${WEATHER_URI})`)

  // 4. Ticker (scrolling + red pulse, bottom).
  const tickerPl = await addRegion(draftId, { width: 1840, height: 120, top: 920, left: 40 })
  const tickerWidget = await api(`/playlist/widget/text/${tickerPl}`, { method: "POST" })
  await api(`/playlist/widget/${tickerWidget.widgetId}`, {
    method: "PUT",
    form: { text: TICKER_HTML, duration: PERSIST_SECONDS, useDuration: 1 },
  })
  console.log("  ✓ ticker (scroll + puls)")

  await api(`/layout/publish/${layoutId}`, { method: "PUT", form: { publishNow: 1 } })
  console.log(`\n✅ Publisert. Forhåndsvis: ${BASE}/campaign/${BASE_CAMPAIGN_ID}/preview`)
}

main().catch((e) => {
  console.error("FEIL:", e.message)
  process.exit(1)
})
