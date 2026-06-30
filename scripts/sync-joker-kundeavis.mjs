/**
 * Weekly JOKER customer-flyer ("kundeavis") sync.
 *
 * JOKER's flyer is a Flipsnack flipbook (white-labelled publ.joker.no/digital-avis-uke-N).
 * Flipsnack signs the interior page images (all 403), so we CANNOT extract every
 * page like the SPAR/EUROSPAR PDF. Only the COVER (og:image) is public. So the
 * JOKER kundeavis card = full-screen cover + a QR ("Skann for hele avisen") to the
 * live Flipsnack avis — customers get the full interactive flyer on their phone.
 * Robust (no fragile scraping of signed content).
 *
 * Creates/updates ONE "news" item (cover image + applyUrl → QR), targeted to all
 * JOKER stores, valid for the ISO week. Upserted by a body marker. Idempotent.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Run: node scripts/sync-joker-kundeavis.mjs   (uses .env.local locally)
 */

import { readFileSync } from "node:fs"

const SOURCE = "kundeavis-joker"
const UA = "Mozilla/5.0 (compatible; Infoskjerm-kundeavis/1.0)"

function env(key) {
  if (process.env[key]) return process.env[key]
  try {
    const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined
  } catch {
    return undefined
  }
}

const SB = env("NEXT_PUBLIC_SUPABASE_URL")
const KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if (!SB || !KEY) { console.error("Mangler Supabase-env"); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const HJ = { ...H, "Content-Type": "application/json" }

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}
function weekRange(d) {
  const day = (d.getUTCDay() + 6) % 7
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - day)
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

const now = new Date()
const week = isoWeek(now)
const { from, to } = weekRange(now)
const avisUrl = `https://publ.joker.no/digital-avis-uke-${week}`

// 1. Scrape the Flipsnack page for the public cover image (og:image).
const res = await fetch(avisUrl, { headers: { "User-Agent": UA }, cache: "no-store" })
if (!res.ok) { console.error(`Joker-avis uke ${week}: ${res.status} — finnes ikke ennå?`); process.exit(0) }
const html = await res.text()
const cover = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || html.match(/og:image"\s+content="([^"]+)"/)?.[1]
if (!cover) { console.error("Fant ingen forside (og:image) i Joker-avisen"); process.exit(0) }
// Prefer a larger render than the og "medium" default if the path allows it (kept as-is otherwise).
console.log(`Joker uke ${week}: forside ${cover}`)

// 2. Download cover + upload to media bucket.
const imgRes = await fetch(cover, { headers: { "User-Agent": UA } })
if (!imgRes.ok) { console.error(`Forside-nedlasting: ${imgRes.status}`); process.exit(1) }
const bytes = Buffer.from(await imgRes.arrayBuffer())
const path = `kundeavis/joker-uke-${week}.jpg`
const up = await fetch(`${SB}/storage/v1/object/media/${path}`, {
  method: "POST", headers: { ...H, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: bytes,
})
if (!up.ok) { console.error(`Opplasting: ${up.status} ${await up.text()}`); process.exit(1) }
const imageUrl = `${SB}/storage/v1/object/public/media/${path}`
console.log(`  ✓ forside lastet opp (${bytes.length} b)`)

// 3. JOKER store targets.
const stores = await (await fetch(`${SB}/rest/v1/stores?select=id,name,chains(name)`, { headers: H })).json()
const jokerIds = (stores || []).filter((s) => (s.chains?.name || "").toUpperCase() === "JOKER").map((s) => s.id)
console.log(`  JOKER-butikker: ${jokerIds.length}`)

// 4. Upsert the single JOKER kundeavis item (find by source marker).
const [tenant] = await (await fetch(`${SB}/rest/v1/tenants?select=id&limit=1`, { headers: H })).json()
const [user] = await (await fetch(`${SB}/rest/v1/users?select=id&limit=1`, { headers: H })).json()
const existing = await (await fetch(`${SB}/rest/v1/content_items?select=id&order=created_at.asc&body->>source=eq.${SOURCE}`, { headers: H })).json()

const body = {
  html: "<p>Se hele kundeavisen — skann QR-koden for den digitale avisen.</p>",
  imageUrl, imageUrls: [imageUrl], imageMode: "plakat", audience: "kunde",
  applyUrl: avisUrl, source: SOURCE,
}
const fields = { title: `Kundeavis uke ${week} – Joker`, type: "news", body, status: "live", valid_from: from, valid_to: to, published_at: now.toISOString(), updated_at: now.toISOString() }

let itemId = existing?.[0]?.id
if (itemId) {
  await fetch(`${SB}/rest/v1/content_items?id=eq.${itemId}`, { method: "PATCH", headers: { ...HJ, Prefer: "return=minimal" }, body: JSON.stringify(fields) })
  // archive any duplicates
  for (const r of (existing || []).slice(1)) await fetch(`${SB}/rest/v1/content_items?id=eq.${r.id}`, { method: "PATCH", headers: HJ, body: JSON.stringify({ status: "archived" }) })
} else {
  const ins = await (await fetch(`${SB}/rest/v1/content_items`, { method: "POST", headers: { ...HJ, Prefer: "return=representation" }, body: JSON.stringify({ ...fields, tenant_id: tenant.id, created_by: user.id }) })).json()
  itemId = ins?.[0]?.id
}
if (!itemId) { console.error("Kunne ikke opprette JOKER-item"); process.exit(1) }

// 5. Targets.
await fetch(`${SB}/rest/v1/content_targets?content_item_id=eq.${itemId}`, { method: "DELETE", headers: H })
if (jokerIds.length) await fetch(`${SB}/rest/v1/content_targets`, { method: "POST", headers: HJ, body: JSON.stringify(jokerIds.map((id) => ({ content_item_id: itemId, store_id: id }))) })

console.log(`\n✅ JOKER kundeavis uke ${week} live (forside + QR → ${avisUrl}), målrettet ${jokerIds.length} butikker.`)
