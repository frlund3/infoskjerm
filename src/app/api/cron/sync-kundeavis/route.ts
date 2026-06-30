import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * Weekly customer-flyer ("kundeavis") sync.
 *
 * SPAR/EUROSPAR: one national PDF, scraped from any store's spar.no page
 * (cdn.sanity.io/.../*.pdf). We keep ONE customer offer item ("Kundeavis uke N")
 * targeting all SPAR/EUROSPAR stores, valid for the ISO week — it shows on the
 * customer screens via the offer/tilbud widget (PDF). Upserted by a body marker,
 * so re-running just refreshes the PDF + period.
 *
 * JOKER: the flyer is a publitas web viewer (publ.joker.no/digital-avis-uke-N)
 * that blocks framing — it can't be embedded as-is, so we only report its URL.
 * Page-image extraction is a separate job.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

const UA = "Mozilla/5.0 (compatible; Infoskjerm-kundeavis/1.0)"
const SPAR_PROBE = "https://spar.no/finn-butikk/eurospar-moa"
const SOURCE = "kundeavis-spar"
const MAX_PAGES = 6
const PAGE_SCALE = 1.5

/**
 * Rasterises the first pages of the flyer PDF to JPEGs (server-side, pdfjs v4 +
 * @napi-rs/canvas via lib/content/pdf-render) and uploads them to the public
 * `media` bucket, so customer screens show ready images instantly — no
 * client-side PDF rendering on the weak Raspberry Pis. Best-effort: any failure
 * returns [] and the widget falls back to client PDF.
 */
async function renderAndUploadPages(pdfUrl: string, week: number, supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  try {
    const res = await fetch(pdfUrl, { cache: "no-store" })
    if (!res.ok) return []
    const bytes = new Uint8Array(await res.arrayBuffer())
    const { renderPdfPagesToJpeg } = await import("@/lib/content/pdf-render")
    const buffers = await renderPdfPagesToJpeg(bytes, { maxPages: MAX_PAGES, scale: PAGE_SCALE })
    const urls: string[] = []
    for (let i = 0; i < buffers.length; i++) {
      const path = `kundeavis/uke-${week}-${i + 1}.jpg`
      const up = await supabase.storage.from("media").upload(path, buffers[i], { contentType: "image/jpeg", upsert: true })
      if (!up.error) urls.push(supabase.storage.from("media").getPublicUrl(path).data.publicUrl)
    }
    return urls
  } catch (err) {
    console.error("kundeavis-render feilet:", err)
    return []
  }
}

function isoWeek(d: Date): { week: number; year: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return { week, year: date.getUTCFullYear() }
}

function weekRange(d: Date): { from: string; to: string } {
  const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
  const mon = new Date(d)
  mon.setUTCDate(d.getUTCDate() - day)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Scrape the national SPAR/EUROSPAR PDF.
    const res = await fetch(SPAR_PROBE, { headers: { "User-Agent": UA }, cache: "no-store" })
    if (!res.ok) throw new Error(`spar.no ${res.status}`)
    const html = await res.text()
    const pdf = html.match(/https:\/\/cdn\.sanity\.io\/files\/[^"'\s]+\.pdf/)?.[0]
    if (!pdf) return NextResponse.json({ ok: false, error: "Fant ingen kundeavis-PDF på spar.no" })

    const now = new Date()
    const { week, year } = isoWeek(now)
    const { from, to } = weekRange(now)
    const title = `Kundeavis uke ${week}`

    const supabase = createAdminClient()

    // 2. Resolve tenant + SPAR/EUROSPAR store targets.
    const [{ data: tenant }, { data: sysUser }, { data: stores }] = await Promise.all([
      supabase.from("tenants").select("id").limit(1).single(),
      supabase.from("users").select("id").limit(1).single(),
      supabase.from("stores").select("id, name, chains(name)"),
    ])
    const sparStoreIds = (stores ?? [])
      .filter((s) => {
        const chain = (s.chains as { name: string } | null)?.name?.toUpperCase() ?? ""
        return chain === "SPAR" || chain === "EUROSPAR"
      })
      .map((s) => s.id)
    const jokerUrl = `https://publ.joker.no/digital-avis-uke-${week}`

    // 3. Upsert the single SPAR kundeavis item (find by body marker). A new week
    // MUST deactivate the previous avis: we keep ONE row and archive any extras,
    // so a stale week can never linger live alongside the current one.
    const { data: existingRows } = await supabase
      .from("content_items")
      .select("id, created_at, body, valid_to")
      .filter("body->>source", "eq", SOURCE)
      .order("created_at", { ascending: true })

    const existing = existingRows?.[0]
    let itemId = existing?.id

    // Reuse already-rendered page images for the same week; otherwise render now.
    const existingBody = (existing?.body ?? {}) as { pages?: string[] }
    const sameWeek = existing?.valid_to === to && Array.isArray(existingBody.pages) && existingBody.pages.length > 0
    const pages = sameWeek ? existingBody.pages! : await renderAndUploadPages(pdf, week, supabase)

    const body = { imageUrl: pdf, imageUrls: [pdf], imageMode: "plakat", audience: "kunde", source: SOURCE, ...(pages.length > 0 ? { pages } : {}) }

    // Archive any duplicate kundeavis rows beyond the one we reuse.
    const staleIds = (existingRows ?? []).slice(1).map((r) => r.id)
    if (staleIds.length > 0) {
      await supabase.from("content_items").update({ status: "archived" }).in("id", staleIds)
      await supabase.from("content_targets").delete().in("content_item_id", staleIds)
    }
    if (itemId) {
      await supabase
        .from("content_items")
        .update({ title, type: "slide", body, status: "live", valid_from: from, valid_to: to, published_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", itemId)
    } else {
      if (!tenant?.id || !sysUser?.id) throw new Error("Fant ingen tenant/bruker")
      const { data: created, error } = await supabase
        .from("content_items")
        .insert({ title, type: "slide", body, status: "live", tenant_id: tenant.id, created_by: sysUser.id, valid_from: from, valid_to: to, published_at: now.toISOString() })
        .select("id")
        .single()
      if (error || !created) throw new Error(error?.message ?? "Kunne ikke opprette kundeavis")
      itemId = created.id
    }

    // 4. Targets = all SPAR/EUROSPAR stores.
    await supabase.from("content_targets").delete().eq("content_item_id", itemId)
    if (sparStoreIds.length > 0) {
      await supabase.from("content_targets").insert(sparStoreIds.map((sid) => ({ content_item_id: itemId!, store_id: sid })))
    }

    return NextResponse.json({
      ok: true,
      week,
      year,
      pdf,
      pages: pages.length,
      sparStores: sparStoreIds.length,
      joker: { url: jokerUrl, note: "Publitas-flyer blokkerer embedding — krever side-bilde-uttrekk (ikke implementert)" },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Ukjent feil" }, { status: 500 })
  }
}
