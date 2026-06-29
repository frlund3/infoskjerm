import QRCode from "qrcode"
import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
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

const CARD_TYPES = ["news", "competition", "slide", "job", "birthday", "stats"]

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default async function NewsWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const [items, tickerItems] = await Promise.all([
    fetchLiveContent(store ?? null, CARD_TYPES),
    fetchLiveContent(store ?? null, ["ticker"]),
  ])
  const ticker = tickerItems.map((t) => t.title.trim()).filter(Boolean)

  // Pre-generate QR codes (PNG data URLs) for job ads with an application link.
  const qr: Record<string, string> = {}
  for (const it of items) {
    if (it.type === "job" && it.applyUrl?.trim()) {
      try {
        qr[it.id] = await QRCode.toDataURL(normalizeUrl(it.applyUrl), {
          margin: 1,
          width: 320,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        })
      } catch {
        // best-effort; skip QR on failure
      }
    }
  }

  return <NewsRotator items={items as LiveItem[]} qr={qr} ticker={ticker} />
}
