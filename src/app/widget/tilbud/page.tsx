import QRCode from "qrcode"
import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { createAdminClient } from "@/lib/supabase/server"
import { TilbudRotator } from "./tilbud-rotator"
import type { ChainBrand } from "./offer-card"

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/**
 * Full-screen offer presentation embedded into a per-store Xibo "Tilbud" layout.
 * A left side panel carries the heading/period/text; the poster or PDF fills the
 * rest; a bottom ticker shows when active. The layout is only scheduled onto a
 * store's screen while that store has active offers (see lib/xibo/offers.ts),
 * so this page normally always has something to show.
 *
 * The store's chain (EUROSPAR/SPAR/JOKER) drives the logo on the offer card, so
 * each store shows its own chain's branding.
 *
 * Usage: /widget/tilbud?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface StoreChainRow {
  name: string
  chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null
}

export default async function TilbudWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string; avdeling?: string }> }) {
  const { store, avdeling } = await searchParams
  const supabase = createAdminClient()

  const [slides, comps, storeRow, tickerItems] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde", avdeling),
    // Customer competitions — same flashy module as internal, shown on the screen.
    fetchLiveContent(store ?? null, ["competition"], "kunde", avdeling),
    store
      ? supabase.from("stores").select("name, chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
    // Opt-in customer ticker: only kunde-audience tickers targeted to this store.
    fetchLiveContent(store ?? null, ["ticker"], "kunde"),
  ])
  // Competitions first (newest, attention-grabbing), then offers.
  const items = [...(comps as LiveItem[]), ...(slides as LiveItem[])]
  const ticker = (tickerItems as LiveItem[]).map((t) => t.title.trim()).filter(Boolean)

  // QR codes for competitions with a participation link.
  const qr: Record<string, string> = {}
  for (const it of comps as LiveItem[]) {
    if (it.applyUrl?.trim()) {
      try {
        qr[it.id] = await QRCode.toDataURL(normalizeUrl(it.applyUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
      } catch { /* best-effort */ }
    }
  }

  const row = storeRow.data as unknown as StoreChainRow | null
  const storeName = row?.name ?? null
  const chainRow = row?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null

  // Customer ticker only when explicitly created for these screens (opt-in).
  return <TilbudRotator items={items} ticker={ticker} storeName={storeName} chain={chain} qr={qr} />
}
