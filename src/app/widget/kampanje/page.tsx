import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { createAdminClient } from "@/lib/supabase/server"
import { KampanjeRotator } from "./kampanje-rotator"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"

/**
 * LIGGENDE kunde-kampanjeskjerm (1920×1080) — premium plakat-mal i bilforhandler-
 * stil. Viser butikkens kunde-slides (kampanjekort/plakater) + kunde-artikler,
 * med kjedens branding. Embeddes i en liggende Xibo-layout eller åpnes som kiosk
 * via /vis/<enhet>?orientation=liggende.
 *
 * Bruk: /widget/kampanje?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface ChainRow {
  chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null
}

export default async function KampanjeWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const supabase = createAdminClient()

  const [slides, articles, storeRow] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde"),
    fetchLiveContent(store ?? null, ["news"], "kunde"),
    store
      ? supabase.from("stores").select("chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Kampanjekort/plakater først, deretter artikler.
  const items = [...(slides as LiveItem[]), ...(articles as LiveItem[])]

  const row = storeRow.data as unknown as ChainRow | null
  const chainRow = row?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null

  return <KampanjeRotator items={items} chain={chain} />
}
