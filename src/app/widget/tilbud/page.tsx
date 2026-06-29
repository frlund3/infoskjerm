import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { createAdminClient } from "@/lib/supabase/server"
import { TilbudRotator } from "./tilbud-rotator"

/**
 * Full-screen offer presentation embedded into a per-store Xibo "Tilbud" layout.
 * A left side panel carries the heading/period/text; the poster or PDF fills the
 * rest; a bottom ticker shows when active. The layout is only scheduled onto a
 * store's screen while that store has active offers (see lib/xibo/offers.ts),
 * so this page normally always has something to show.
 *
 * Usage: /widget/tilbud?store=<storeId>
 */

export const dynamic = "force-dynamic"

export default async function TilbudWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const supabase = createAdminClient()

  const [items, storeRow] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde"),
    store ? supabase.from("stores").select("name").eq("id", store).maybeSingle() : Promise.resolve({ data: null }),
  ])

  // Customer screens never show the ticker.
  const storeName = (storeRow.data as { name: string } | null)?.name ?? null

  return <TilbudRotator items={items as LiveItem[]} ticker={[]} storeName={storeName} />
}
