import { createAdminClient } from "@/lib/supabase/server"

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

// ---------- formatting + derived helpers ----------

/** Norwegian kr, compact for signage: ≥1M → "1,80 mill", else thousand-separated. */
export function kr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–"
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mill`
  return value.toLocaleString("nb-NO", { maximumFractionDigits: 0 })
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  return `${value.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

export function ratio(num: number | null | undefined, den: number | null | undefined): number | null {
  if (!num || !den) return null
  return (num / den) * 100
}

/** Percentage difference of a vs b ((a-b)/b * 100). */
export function diffPct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || !b) return null
  return ((a - b) / Math.abs(b)) * 100
}

export function sum(weeks: WeekKpi[], key: keyof WeekKpi): number {
  return weeks.reduce((acc, w) => acc + (typeof w[key] === "number" ? (w[key] as number) : 0), 0)
}
