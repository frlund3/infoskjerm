import { Topbar } from "@/components/admin/topbar"
import { requireRole } from "@/lib/admin/require-role"
import { fetchLiveContent } from "@/lib/content/live"
import { ScreenPreview, type PreviewStore } from "./screen-preview"

/**
 * "Skjermsystem" — the CMS user's window into what each store's screen is
 * actually showing right now, composed from the live widgets. No Xibo exposure:
 * the user previews here and never logs into the screen engine.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export default async function CmsDashboardPage() {
  const { supabase } = await requireRole([...VIEW_ROLES])

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, city, latitude, longitude")
    .order("name")

  const list = stores ?? []
  // Flag stores that currently have active offers (so the Tilbud tab is labelled).
  const hasOffers = await Promise.all(
    list.map((s) => fetchLiveContent(s.id, ["slide"]).then((r) => r.length > 0).catch(() => false))
  )
  const previewStores: PreviewStore[] = list.map((s, i) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    lat: s.latitude,
    lon: s.longitude,
    hasOffers: hasOffers[i],
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Skjermsystem" subtitle="Forhåndsvis hva som vises på hver butikks skjerm" />
      <div className="flex-1 p-6 max-w-5xl">
        {previewStores.length === 0 ? (
          <p className="text-sm text-zinc-500">Ingen butikker er satt opp ennå.</p>
        ) : (
          <ScreenPreview stores={previewStores} />
        )}
      </div>
    </div>
  )
}
