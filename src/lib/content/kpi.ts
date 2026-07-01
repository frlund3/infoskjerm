import { createAdminClient } from "@/lib/supabase/server"
import { kr, pct, ratio, diffPct, sum } from "./kpi-format"

// Formatererne bor i kpi-format.ts (klient-trygge). Re-eksporteres her så alle
// eksisterende server-kallsteder (som importerer fra @/lib/content/kpi) består.
export { kr, pct, ratio, diffPct, sum }

/**
 * Reads synced operational KPIs (from Gange-Rolv Drift) for the staff KPI
 * dashboard. Server-only (service role). Data is populated daily by
 * /api/cron/sync-kpi into store_kpi_week + store_svinn_kommentert.
 */

export interface WeekKpi {
  uke: number
  netto_omsetning: number | null
  budsjett_omsetning: number | null
  netto_omsetning_fjoraaret: number | null
  brutto_kr: number | null
  budsjett_brutto_kr: number | null
  lonn_kr: number | null
  budsjett_lonn: number | null
  svinn_total: number | null
}

export interface SvinnKommentert {
  kommentert: number
  ikke_kommentert: number
  prosent: number | null
  svinnProsent: number | null
}

export interface StoreKpi {
  storeName: string
  year: number
  latestWeek: number
  importedAt: string | null
  weeks: WeekKpi[]
  svinn: SvinnKommentert | null
}

export async function fetchStoreKpi(storeId: string): Promise<StoreKpi | null> {
  const supabase = createAdminClient()
  const year = new Date().getFullYear()

  const [{ data: store }, { data: rows }, { data: svinn }] = await Promise.all([
    supabase.from("stores").select("name").eq("id", storeId).single(),
    supabase
      .from("store_kpi_week")
      .select("uke, netto_omsetning, budsjett_omsetning, netto_omsetning_fjoraaret, brutto_kr, budsjett_brutto_kr, lonn_kr, budsjett_lonn, svinn_total, importert_tidspunkt")
      .eq("store_id", storeId)
      .eq("ar", year)
      .order("uke", { ascending: true }),
    supabase.from("store_svinn_kommentert").select("kommentert, ikke_kommentert, kommentert_prosent, svinn_prosent").eq("store_id", storeId).maybeSingle(),
  ])

  if (!store || !rows || rows.length === 0) return null

  const weeks: WeekKpi[] = rows.map((r) => ({
    uke: r.uke,
    netto_omsetning: r.netto_omsetning,
    budsjett_omsetning: r.budsjett_omsetning,
    netto_omsetning_fjoraaret: r.netto_omsetning_fjoraaret,
    brutto_kr: r.brutto_kr,
    budsjett_brutto_kr: r.budsjett_brutto_kr,
    lonn_kr: r.lonn_kr,
    budsjett_lonn: r.budsjett_lonn,
    svinn_total: r.svinn_total,
  }))

  const latestWeek = weeks[weeks.length - 1].uke
  const importedAt = (rows[rows.length - 1] as { importert_tidspunkt: string | null }).importert_tidspunkt ?? null

  return {
    storeName: store.name,
    year,
    latestWeek,
    importedAt,
    weeks,
    svinn: svinn
      ? {
          kommentert: svinn.kommentert ?? 0,
          ikke_kommentert: svinn.ikke_kommentert ?? 0,
          prosent: svinn.kommentert_prosent,
          svinnProsent: svinn.svinn_prosent,
        }
      : null,
  }
}

export interface StoreKpiRow {
  storeName: string
  uke: number
  // Latest week
  omsetning: number | null
  budsjett: number | null
  fjor: number | null
  bruttoPct: number | null
  lonnPct: number | null
  svinnPct: number | null
  // Year to date
  ytdOmsetning: number
  ytdBudsjett: number
  ytdFjor: number
  ytdBruttoPct: number | null
  ytdLonnPct: number | null
  ytdSvinnPct: number | null
}

export interface AllStoresKpi {
  year: number
  latestWeek: number
  stores: StoreKpiRow[]
  total: { omsetning: number; budsjett: number; fjor: number; ytdOmsetning: number; ytdBudsjett: number; ytdFjor: number }
}

/**
 * Aggregates the latest week + YTD per store for the all-stores overview.
 * Tenant-scoping er OBLIGATORISK: uten en tenant returneres ingenting, så
 * konfidensielle KPI-tall aldri lekker på tvers av tenants på skjerm. Butikker
 * scopes til tenanten; KPI-rader for andre tenanters butikker faller bort (deres
 * store-id finnes ikke i nameById → hoppes over).
 */
export async function fetchAllStoresKpi(tenantId: string | null): Promise<AllStoresKpi | null> {
  if (!tenantId) return null
  const supabase = createAdminClient()
  const year = new Date().getFullYear()

  const [{ data: stores }, { data: rows }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("tenant_id", tenantId),
    supabase
      .from("store_kpi_week")
      .select("store_id, uke, netto_omsetning, budsjett_omsetning, netto_omsetning_fjoraaret, brutto_kr, lonn_kr, svinn_total")
      .eq("ar", year)
      .order("uke", { ascending: true }),
  ])
  if (!stores || !rows || rows.length === 0) return null

  const nameById = new Map(stores.map((s) => [s.id, s.name]))
  const byStore = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byStore.get(r.store_id) ?? []
    list.push(r)
    byStore.set(r.store_id, list)
  }

  const out: StoreKpiRow[] = []
  const total = { omsetning: 0, budsjett: 0, fjor: 0, ytdOmsetning: 0, ytdBudsjett: 0, ytdFjor: 0 }
  let latestWeek = 0

  for (const [storeId, list] of byStore) {
    const name = nameById.get(storeId)
    if (!name) continue
    const last = list[list.length - 1]
    latestWeek = Math.max(latestWeek, last.uke)
    const ytd = list.reduce(
      (a, w) => {
        a.oms += w.netto_omsetning ?? 0
        a.bud += w.budsjett_omsetning ?? 0
        a.fjor += w.netto_omsetning_fjoraaret ?? 0
        a.brutto += w.brutto_kr ?? 0
        a.lonn += w.lonn_kr ?? 0
        a.svinn += w.svinn_total ?? 0
        return a
      },
      { oms: 0, bud: 0, fjor: 0, brutto: 0, lonn: 0, svinn: 0 }
    )
    out.push({
      storeName: name,
      uke: last.uke,
      omsetning: last.netto_omsetning,
      budsjett: last.budsjett_omsetning,
      fjor: last.netto_omsetning_fjoraaret,
      bruttoPct: ratio(last.brutto_kr, last.netto_omsetning),
      lonnPct: ratio(last.lonn_kr, last.netto_omsetning),
      svinnPct: ratio(last.svinn_total, last.netto_omsetning),
      ytdOmsetning: ytd.oms,
      ytdBudsjett: ytd.bud,
      ytdFjor: ytd.fjor,
      ytdBruttoPct: ratio(ytd.brutto, ytd.oms),
      ytdLonnPct: ratio(ytd.lonn, ytd.oms),
      ytdSvinnPct: ratio(ytd.svinn, ytd.oms),
    })
    total.omsetning += last.netto_omsetning ?? 0
    total.budsjett += last.budsjett_omsetning ?? 0
    total.fjor += last.netto_omsetning_fjoraaret ?? 0
    total.ytdOmsetning += ytd.oms
    total.ytdBudsjett += ytd.bud
    total.ytdFjor += ytd.fjor
  }

  out.sort((a, b) => (diffPct(b.omsetning, b.budsjett) ?? -999) - (diffPct(a.omsetning, a.budsjett) ?? -999))
  return { year, latestWeek, stores: out, total }
}

// ---------- formatting + derived helpers ----------
// kr/pct/ratio/diffPct/sum er flyttet til ./kpi-format (klient-trygge) og
// re-eksporteres øverst i denne filen.
