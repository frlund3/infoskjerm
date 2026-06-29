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
  kundeklubb_enabled: boolean | null
  kundeklubb_url: string | null
  kundeklubb_headline: string | null
  kundeklubb_subtext: string | null
  chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null
}

/** Synthetic LiveItem for the per-store customer-club card (settings, not CMS). */
function klubbLiveItem(headline: string, subtext: string): LiveItem {
  return {
    id: "kundeklubb", type: "slide", title: headline, blocks: [], imageUrl: null, imageUrls: [],
    imageMode: "plakat", isPdf: false, isVideo: false, durationSeconds: null, pages: [], validFrom: null, validTo: null, author: "", date: "",
    contactPerson: null, applyUrl: null, statsValue: null, statsChange: null, offer: null,
    avdeling: "felles", bgColor: null, textColor: null, klubb: { headline, subtext },
  }
}

export default async function TilbudWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string; avdeling?: string }> }) {
  const { store, avdeling } = await searchParams
  const supabase = createAdminClient()

  const [slides, comps, storeRow, tickerItems] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde", avdeling),
    // Customer competitions — same flashy module as internal, shown on the screen.
    fetchLiveContent(store ?? null, ["competition"], "kunde", avdeling),
    store
      ? supabase.from("stores").select("name, kundeklubb_enabled, kundeklubb_url, kundeklubb_headline, kundeklubb_subtext, chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
    // Opt-in customer ticker: only kunde-audience tickers targeted to this store.
    fetchLiveContent(store ?? null, ["ticker"], "kunde"),
  ])
  // Competitions first (newest, attention-grabbing), then offers.
  const items = [...(comps as LiveItem[]), ...(slides as LiveItem[])]
  const ticker = (tickerItems as LiveItem[]).map((t) => t.title.trim()).filter(Boolean)

  // QR codes: competitions (participation link) + kundeklubb (per-store sign-up).
  const qr: Record<string, string> = {}
  for (const it of comps as LiveItem[]) {
    if (it.applyUrl?.trim()) {
      try {
        qr[it.id] = await QRCode.toDataURL(normalizeUrl(it.applyUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
      } catch { /* best-effort */ }
    }
  }
  const row = storeRow.data as unknown as StoreChainRow | null

  // Per-store customer club: when enabled with a URL, inject a QR card pointing
  // to THAT store's own sign-up link (set in Butikker → store → Kundeklubb).
  if (row?.kundeklubb_enabled && row.kundeklubb_url?.trim()) {
    const klubbItem = klubbLiveItem(
      row.kundeklubb_headline || "Bli medlem – det er gratis",
      row.kundeklubb_subtext || "Medlemspriser, bonus og ukens beste tilbud.",
    )
    items.push(klubbItem)
    qr[klubbItem.id] = await QRCode.toDataURL(normalizeUrl(row.kundeklubb_url), { margin: 1, width: 700, color: { dark: "#0a0a0a", light: "#ffffff" } }).catch(() => "")
  }

  const storeName = row?.name ?? null
  const chainRow = row?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null

  // Customer ticker only when explicitly created for these screens (opt-in).
  return <TilbudRotator items={items} ticker={ticker} storeName={storeName} chain={chain} qr={qr} />
}
