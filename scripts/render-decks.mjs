/**
 * Pre-renders PowerPoint-decks (.pptx/.ppt) to page JPEGs in Supabase storage and
 * writes the URLs into the content item's body.pages — så kundeskjermer og interne
 * skjermer viser presentasjonen som roterende sidebilder (PdfFlyer), instant, uten
 * arbeid på de svake Raspberry Pi-ene. PowerPoint kan IKKE rasteriseres i
 * nettleseren, så server-render er eneste vei.
 *
 * Kjører i GitHub Action (Node på Ubuntu, der LibreOffice + pdfjs + @napi-rs/canvas
 * virker). LibreOffice konverterer PPTX → PDF (samme steg som Xibo bruker internt),
 * deretter rasteriserer vi de 6 første sidene med den samme pdfjs-motoren som
 * kundeavis-renderen. Idempotent: hopper over decks som allerede er rendret for
 * gjeldende fil (body.pagesFor === imageUrl).
 *
 * Speiler render-kundeavis.mjs (PDF), men er bevisst et eget script så PDF-flyten
 * forblir urørt.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Run: node scripts/render-decks.mjs   (krever LibreOffice; bruker .env.local lokalt)
 */

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import { createCanvas } from "@napi-rs/canvas"

const require = createRequire(import.meta.url)
try {
  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
} catch {}

const MAX_PAGES = 6
// 3.0 → skarpe sider også på store/4K TV-skjermer (1.5 ble kornet ved oppskalering).
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

/** Finn soffice/libreoffice på PATH (Ubuntu-runner har vanligvis begge). */
function sofficeBin() {
  for (const bin of ["soffice", "libreoffice"]) {
    try {
      execFileSync(bin, ["--version"], { stdio: "ignore" })
      return bin
    } catch {}
  }
  throw new Error("LibreOffice (soffice) ikke funnet på PATH")
}
const SOFFICE = sofficeBin()

class NodeCanvasFactory {
  create(w, h) {
    const c = createCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
    return { canvas: c, context: c.getContext("2d") }
  }
  reset(cc, w, h) { cc.canvas.width = Math.max(1, Math.ceil(w)); cc.canvas.height = Math.max(1, Math.ceil(h)) }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0 }
}

/** Laster ned PPTX/PPT og konverterer til PDF-bytes via LibreOffice headless. */
async function pptToPdfBytes(pptUrl) {
  const clean = pptUrl.toLowerCase().split("?")[0]
  const ext = clean.endsWith(".ppt") ? "ppt" : "pptx"
  const dir = mkdtempSync(join(tmpdir(), "deck-"))
  const src = join(dir, `deck.${ext}`)
  const data = Buffer.from(await (await fetch(pptUrl)).arrayBuffer())
  writeFileSync(src, data)
  // LibreOffice trenger en egen profil-mappe i CI for å ikke kollidere/henge.
  execFileSync(SOFFICE, [
    "--headless", "--norestore", "--nolockcheck",
    `-env:UserInstallation=file://${join(dir, "lo-profile")}`,
    "--convert-to", "pdf", "--outdir", dir, src,
  ], { stdio: "ignore", timeout: 120000 })
  const pdfPath = join(dir, "deck.pdf")
  if (!existsSync(pdfPath)) throw new Error("LibreOffice produserte ingen PDF")
  return new Uint8Array(readFileSync(pdfPath))
}

/** Rasteriser de N første PDF-sidene til JPEG-buffere. */
async function renderPdfBytes(data) {
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

// Live slide-items med en PowerPoint-fil.
const items = await (
  await fetch(`${SB}/rest/v1/content_items?select=id,title,body,status&type=eq.slide&status=eq.live&limit=200`, { headers: H })
).json()
const pptItems = (items || []).filter((x) => {
  const u = String(x.body?.imageUrl || "").toLowerCase().split("?")[0]
  return u.endsWith(".pptx") || u.endsWith(".ppt")
})
console.log(`Fant ${pptItems.length} live PowerPoint-item(er)`)

let rendered = 0
for (const item of pptItems) {
  const pptUrl = item.body.imageUrl
  const havePages = Array.isArray(item.body.pages) && item.body.pages.length > 0
  // Re-render når sider mangler ELLER ble rendret fra en annen fil.
  if (havePages && item.body.pagesFor === pptUrl) {
    console.log(`  – ${item.title}: allerede rendret (${item.body.pages.length} sider)`)
    continue
  }
  try {
    const pdfBytes = await pptToPdfBytes(pptUrl)
    const buffers = await renderPdfBytes(pdfBytes)
    const urls = []
    for (let i = 0; i < buffers.length; i++) {
      urls.push(await uploadPage(`decks/${item.id}-p${i + 1}.jpg`, buffers[i]))
    }
    const newBody = { ...item.body, pages: urls, pagesFor: pptUrl }
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
console.log(`\n✅ ferdig: ${rendered} PowerPoint-deck(er) rendret.`)
