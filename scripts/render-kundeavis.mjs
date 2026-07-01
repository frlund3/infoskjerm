/**
 * Pre-renders kundeavis PDF pages to JPEGs in Supabase storage and writes the
 * URLs into the content item's body.pages, so customer screens show the flyer
 * INSTANTLY (no client-side pdf.js on the weak Raspberry Pis).
 *
 * Runs in a GitHub Action (Node on Ubuntu, where pdfjs + @napi-rs/canvas work
 * reliably) — Vercel's serverless bundler mangles the native canvas binary +
 * pdf worker, so the in-app cron render always fell back to []. This script is
 * the reliable renderer; the Vercel cron still scrapes spar.no + upserts the item.
 *
 * Processes every live "slide" item whose body.imageUrl is a PDF and which is
 * missing rendered pages (or whose PDF URL changed). Idempotent.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Run: node scripts/render-kundeavis.mjs   (uses .env.local locally)
 */

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import { createCanvas } from "@napi-rs/canvas"

const require = createRequire(import.meta.url)
try {
  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
} catch {}

const MAX_PAGES = 6
// 3.0 gir ~1785px brede A4-sider → skarpt også på store/4K TV-skjermer i butikk.
// (1.5 var kornet ved oppskalering; kundeavisen ble klient-rendret i native
// oppløsning før den flyttet til forhåndsrasterisering.)
const SCALE = 3

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
if (!SB || !KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

class NodeCanvasFactory {
  create(w, h) {
    const c = createCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
    return { canvas: c, context: c.getContext("2d") }
  }
  reset(cc, w, h) { cc.canvas.width = Math.max(1, Math.ceil(w)); cc.canvas.height = Math.max(1, Math.ceil(h)) }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0 }
}

async function renderPages(pdfUrl) {
  const data = new Uint8Array(await (await fetch(pdfUrl)).arrayBuffer())
  const factory = new NodeCanvasFactory()
  const doc = await pdfjs.getDocument({ data, canvasFactory: factory, isEvalSupported: false }).promise
  const total = Math.min(MAX_PAGES, doc.numPages)
  const buffers = []
  for (let p = 1; p <= total; p++) {
    const page = await doc.getPage(p)
    const vp = page.getViewport({ scale: SCALE })
    const cc = factory.create(vp.width, vp.height)
    await page.render({ canvasContext: cc.context, viewport: vp }).promise
    buffers.push(cc.canvas.toBuffer("image/jpeg", 0.9))
  }
  return buffers
}

async function uploadPage(path, jpeg) {
  const up = await fetch(`${SB}/storage/v1/object/media/${path}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: jpeg,
  })
  if (!up.ok) throw new Error(`opplasting ${up.status}: ${await up.text()}`)
  return `${SB}/storage/v1/object/public/media/${path}`
}

// Live slide items with a PDF flyer.
const items = await (
  await fetch(`${SB}/rest/v1/content_items?select=id,title,body,status&type=eq.slide&status=eq.live&limit=200`, { headers: H })
).json()
const pdfItems = (items || []).filter((x) => String(x.body?.imageUrl || "").toLowerCase().split("?")[0].endsWith(".pdf"))
console.log(`Fant ${pdfItems.length} live kundeavis-PDF-item(er)`)

let rendered = 0
for (const item of pdfItems) {
  const pdfUrl = item.body.imageUrl
  const havePages = Array.isArray(item.body.pages) && item.body.pages.length > 0
  // Re-render when pages are missing OR were rendered from a different PDF.
  const renderedFor = item.body.pagesFor
  if (havePages && renderedFor === pdfUrl) {
    console.log(`  – ${item.title}: allerede rendret (${item.body.pages.length} sider)`)
    continue
  }
  try {
    const buffers = await renderPages(pdfUrl)
    const urls = []
    for (let i = 0; i < buffers.length; i++) {
      urls.push(await uploadPage(`kundeavis/${item.id}-p${i + 1}.jpg`, buffers[i]))
    }
    const newBody = { ...item.body, pages: urls, pagesFor: pdfUrl }
    const patch = await fetch(`${SB}/rest/v1/content_items?id=eq.${item.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ body: newBody }),
    })
    if (!patch.ok) throw new Error(`patch ${patch.status}: ${await patch.text()}`)
    rendered++
    console.log(`  ✓ ${item.title}: ${urls.length} sider rendret + lagret`)
  } catch (err) {
    console.error(`  ✗ ${item.title}: ${err.message}`)
  }
}
console.log(`\n✅ ferdig: ${rendered} kundeavis(er) rendret.`)
