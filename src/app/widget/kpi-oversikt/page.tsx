import { fetchAllStoresKpi, diffPct, type StoreKpiRow } from "@/lib/content/kpi"
import { createAdminClient } from "@/lib/supabase/server"
import { KpiOversiktBoard, KpiOversiktEmpty, type RowView } from "./kpi-oversikt-board"

/**
 * Staff/HQ overview: all stores' key figures side by side, ranked by performance
 * vs budget. Operational/confidential — staff & management screens only.
 *
 * Server-siden henter + forbereder serialiserbare rader; klient-boardet
 * (kpi-oversikt-board.tsx) velger liggende tabell vs stående stabling ut fra
 * iframe-orienteringen. 10/10 begge veier, oppløsnings-uavhengig (cq-enheter).
 *
 * Usage:
 *   /widget/kpi-oversikt            → siste innleste uke
 *   /widget/kpi-oversikt?periode=ar → hittil i år (akkumulert)
 */

export const dynamic = "force-dynamic"

function viewFor(row: StoreKpiRow, ytd: boolean): RowView {
  if (ytd) {
    return {
      storeName: row.storeName,
      omsetning: row.ytdOmsetning,
      budsjett: row.ytdBudsjett,
      fjor: row.ytdFjor,
      bruttoPct: row.ytdBruttoPct,
      lonnPct: row.ytdLonnPct,
      svinnPct: row.ytdSvinnPct,
    }
  }
  return {
    storeName: row.storeName,
    omsetning: row.omsetning,
    budsjett: row.budsjett,
    fjor: row.fjor,
    bruttoPct: row.bruttoPct,
    lonnPct: row.lonnPct,
    svinnPct: row.svinnPct,
  }
}

export default async function KpiOverviewPage({ searchParams }: { searchParams: Promise<{ periode?: string; store?: string }> }) {
  const { periode, store } = await searchParams
  const ytd = periode === "ar"
  // Tenant utledes fra butikken skjermen tilhører — KPI vises kun for den tenanten.
  let tenantId: string | null = null
  if (store) {
    const { data: row } = await createAdminClient().from("stores").select("tenant_id").eq("id", store).maybeSingle()
    tenantId = (row as { tenant_id: string | null } | null)?.tenant_id ?? null
  }
  const data = await fetchAllStoresKpi(tenantId)

  if (!data) return <KpiOversiktEmpty />

  // Resolve figures for the chosen period and rank by omsetning vs budsjett.
  const rows = data.stores
    .map((r) => viewFor(r, ytd))
    .sort((a, b) => (diffPct(b.omsetning, b.budsjett) ?? -999) - (diffPct(a.omsetning, a.budsjett) ?? -999))

  const t = data.total
  const heroOms = ytd ? t.ytdOmsetning : t.omsetning
  const heroBud = ytd ? t.ytdBudsjett : t.budsjett
  const heroFjor = ytd ? t.ytdFjor : t.fjor

  return (
    <KpiOversiktBoard
      data={{
        rows,
        heroOms,
        heroBud,
        heroFjor,
        headline: ytd ? `Hittil i år · ${data.year}` : `Uke ${data.latestWeek} · ${data.year}`,
        periodLabel: ytd ? "hittil i år" : "siste uke",
      }}
    />
  )
}
