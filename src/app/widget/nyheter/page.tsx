import QRCode from "qrcode"
import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { getBaseUrl } from "@/lib/base-url"
import { NewsRotator } from "./news-rotator"

/**
 * Public, app-rendered news rotation embedded into the Xibo base/store layouts
 * as a webpage. Full control over per-type cards, image handling (plakat vs
 * background), QR codes for job ads, and KPI/sales cards. Reads live content for
 * the store straight from Supabase.
 *
 * Usage: /widget/nyheter?store=<storeId>   (omit store = all-stores base feed)
 */

export const dynamic = "force-dynamic"

// Customer screens get news-style cards only (offers/tilbud have their own
// full-screen layout). Internal/back-room screens additionally show staff
// "ukens tilbud" slides (poster/PDF/structured offer) + the ticker.
const CARD_TYPES = ["news", "competition", "job", "birthday"]
const INTERNAL_CARD_TYPES = [...CARD_TYPES, "slide", "invitation", "gallery"]

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default async function NewsWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string; flate?: string }> }) {
  const { store, flate } = await searchParams
  // flate=intern → bakrom/ansatte: internt innhold (nyheter/gratulerer/stilling) + ticker.
  // ellers → kundeskjerm: kun kunde-innhold, aldri ticker.
  const audience = flate === "intern" ? "intern" : "kunde"
  const cardTypes = audience === "intern" ? INTERNAL_CARD_TYPES : CARD_TYPES
  const [items, tickerItems] = await Promise.all([
    fetchLiveContent(store ?? null, cardTypes, audience),
    audience === "intern" ? fetchLiveContent(store ?? null, ["ticker"], "intern") : Promise.resolve([]),
  ])
  const ticker = tickerItems.map((t) => t.title.trim()).filter(Boolean)

  // Pre-generate QR codes (PNG data URLs). Job ads + competitions use the
  // authored application link; invitations point to the built-in signup page
  // (/pamelding/<id>) unless signup is disabled on the item.
  const base = await getBaseUrl()
  const qr: Record<string, string> = {}
  for (const it of items) {
    let target: string | null = null
    if ((it.type === "job" || it.type === "competition") && it.applyUrl?.trim()) {
      target = normalizeUrl(it.applyUrl)
    } else if (it.type === "invitation" && it.invitation?.signupEnabled !== false) {
      // Custom link if given, otherwise the built-in signup page.
      target = it.invitation?.signupUrl?.trim()
        ? normalizeUrl(it.invitation.signupUrl)
        : `${base}/pamelding/${it.id}${store ? `?store=${store}` : ""}`
    } else if (it.type === "gallery" && it.gallery?.qrUrl?.trim()) {
      target = normalizeUrl(it.gallery.qrUrl)
    }
    if (!target) continue
    try {
      qr[it.id] = await QRCode.toDataURL(target, {
        margin: 1,
        width: 360,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      })
    } catch {
      // best-effort; skip QR on failure
    }
  }

  return <NewsRotator items={items as LiveItem[]} qr={qr} ticker={ticker} />
}
