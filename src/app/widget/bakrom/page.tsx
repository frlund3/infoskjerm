import { fetchLiveContent } from "@/lib/content/live"
import { BakromRotator, type BakromPanel } from "./bakrom-rotator"

/**
 * Unified BACK-ROOM (bakrom) screen, embedded as one webpage into a single Xibo
 * layout per store. It rotates everything itself (see BakromRotator), so Xibo
 * never has to guess a fixed duration:
 *
 *   internal news (ALL the store's own items, each its own time)
 *   → own KPI dashboard (10s)
 *   → all-stores overview, this week (10s)
 *   → all-stores overview, year to date (10s)
 *   → loop
 *
 * Per store: `?store=<id>` drives the store's own news + KPI; the two all-stores
 * overviews are the same on every back-room (how this store stacks up vs. the rest).
 *
 * Usage: /widget/bakrom?store=<storeId>
 */

export const dynamic = "force-dynamic"

// Same internal card set the internal /widget/nyheter shows.
const INTERNAL_CARD_TYPES = ["news", "competition", "job", "birthday", "slide", "invitation", "gallery"]
// Per-card seconds — MUST match news-rotator so the computed dwell lets the
// embedded news widget show every item exactly once before we advance.
const NEWS_SECONDS: Record<string, number> = { stats: 12, job: 20, competition: 16, invitation: 18, gallery: 30 }
const NEWS_DEFAULT = 16
const KPI_SECONDS = 10

export default async function BakromWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams

  // Compute the news dwell from THIS store's own internal items: sum of each
  // item's on-screen time → every item shows once, its full time, then rotate on.
  const newsItems = store ? await fetchLiveContent(store, INTERNAL_CARD_TYPES, "intern") : []
  const newsDwell = newsItems.reduce(
    (sum, it) => sum + (it.durationSeconds ?? NEWS_SECONDS[it.type] ?? NEWS_DEFAULT),
    0,
  )

  const panels: BakromPanel[] = []
  if (store && newsItems.length > 0) {
    panels.push({ src: `/widget/nyheter?store=${store}&flate=intern`, seconds: newsDwell })
  }
  // KPI-panelene krever store (utleder tenant) — ellers vises de ikke (fail-closed,
  // så konfidensielle tall aldri lekker på tvers av tenants).
  if (store) {
    panels.push({ src: `/widget/butikk-kpi?store=${store}`, seconds: KPI_SECONDS })
    panels.push({ src: `/widget/kpi-oversikt?store=${store}`, seconds: KPI_SECONDS })
    panels.push({ src: `/widget/kpi-oversikt?store=${store}&periode=ar`, seconds: KPI_SECONDS })
  }

  return <BakromRotator panels={panels} />
}
