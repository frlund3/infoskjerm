import { Topbar } from "@/components/admin/topbar"
import { requireRole } from "@/lib/admin/require-role"
import { fetchLiveContent } from "@/lib/content/live"
import { fetchScreensByStore, type StoreScreen } from "@/lib/xibo/screens"
import { fetchScreenInsight } from "@/lib/xibo/insight"
import { ScreenPreview, type PreviewStore } from "./screen-preview"
import { InsightPanel } from "./insight-panel"
import { ContentStatus, type ContentStatusCounts } from "./content-status"
import { RefreshKpiButton } from "./refresh-kpi-button"
import { getTenantConfig } from "@/lib/tenant/config"

/**
 * "Skjermsystem" — the CMS user's window into what each store's screen is
 * actually showing right now, composed from the live widgets. No Xibo exposure:
 * the user previews here and never logs into the screen engine.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export default async function CmsDashboardPage() {
  const { supabase, tenantId } = await requireRole([...VIEW_ROLES])
  const { unitLabel, unitLabelPlural } = await getTenantConfig(supabase, tenantId)

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, city, latitude, longitude")
    .order("name")

  const list = stores ?? []

  // Content health counts for the status strip.
  const nowMs = Date.now()
  const weekMs = nowMs + 7 * 86400000
  const { data: contentRows } = await supabase.from("content_items").select("status, valid_to")
  const counts: ContentStatusCounts = { live: 0, expiringSoon: 0, drafts: 0, expired: 0 }
  for (const r of contentRows ?? []) {
    if (r.status === "draft") counts.drafts++
    if (r.status === "live") {
      counts.live++
      if (r.valid_to) {
        const t = new Date(r.valid_to).getTime()
        if (t < nowMs) counts.expired++
        else if (t <= weekMs) counts.expiringSoon++
      }
    }
  }

  // Flag stores that currently have active offers (so the Tilbud tab is labelled),
  // and read live screen status per store from the engine (empty until Pis connect).
  const [hasOffers, screensByStore, insight] = await Promise.all([
    Promise.all(
      list.map((s) => fetchLiveContent(s.id, ["slide"]).then((r) => r.length > 0).catch(() => false))
    ),
    fetchScreensByStore(list).catch(() => new Map<string, StoreScreen[]>()),
    fetchScreenInsight().catch(() => ({ faults: [], topPlays: [], from: "", to: "" })),
  ])
  const previewStores: PreviewStore[] = list.map((s, i) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    lat: s.latitude,
    lon: s.longitude,
    hasOffers: hasOffers[i],
  }))
  // Plain object for the client boundary (Map isn't serializable).
  const screens: Record<string, StoreScreen[]> = Object.fromEntries(
    list.map((s) => [s.id, screensByStore.get(s.id) ?? []])
  )

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermsystem"
        subtitle={`Forhåndsvis og styr hva som vises på hver ${unitLabel.toLowerCase()}s skjerm`}
        actions={<RefreshKpiButton />}
      />
      <div className="flex-1 p-4 sm:p-6 max-w-5xl">
        {previewStores.length === 0 ? (
          <p className="text-sm text-zinc-500">{`Ingen ${unitLabelPlural.toLowerCase()} er satt opp ennå.`}</p>
        ) : (
          <div className="space-y-6">
            <ContentStatus counts={counts} />
            <InsightPanel insight={insight} />
            <ScreenPreview stores={previewStores} screens={screens} />
          </div>
        )}
      </div>
    </div>
  )
}
