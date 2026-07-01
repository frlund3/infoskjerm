import { fetchStoreKpi, ratio, diffPct, sum } from "@/lib/content/kpi"
import { StoreKpiScreen, type KpiView } from "./count-up"

/**
 * Staff-only KPI dashboard for a store — operational figures synced daily from
 * Gange-Rolv Drift. Shows the latest imported week + year-to-date, with a turnover
 * trend chart and the svinn comment rate. Never on customer-facing screens.
 *
 * Server-siden henter data + regner ut avledede tall; presentasjonen ligger i
 * klient-komponenten StoreKpiScreen, som velger stående (vertikal stabling) vs
 * liggende (to-kolonne split) layout ut fra iframe-orienteringen — 10/10 begge
 * veier, oppløsnings-uavhengig via container-query-enheter.
 *
 * Usage: /widget/butikk-kpi?store=<storeId>
 */

export const dynamic = "force-dynamic"

const MUTED = "rgba(255,255,255,.55)"

export default async function StoreKpiPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const data = store ? await fetchStoreKpi(store) : null

  if (!data) {
    return (
      <main
        style={{
          margin: 0,
          width: "100%",
          height: "100vh",
          boxSizing: "border-box",
          background: "linear-gradient(135deg,#0a0a0a,#141414)",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ color: MUTED, fontSize: "4vmin" }}>Ingen driftstall tilgjengelig</div>
      </main>
    )
  }

  const last = data.weeks[data.weeks.length - 1]
  const oms = last.netto_omsetning
  const budOms = last.budsjett_omsetning
  const fjor = last.netto_omsetning_fjoraaret
  const brutto = ratio(last.brutto_kr, oms)
  const budBrutto = ratio(last.budsjett_brutto_kr, budOms)
  const lonn = ratio(last.lonn_kr, oms)
  const budLonn = ratio(last.budsjett_lonn, budOms)
  const svinn = last.svinn_total

  const ytdOms = sum(data.weeks, "netto_omsetning")
  const ytdBud = sum(data.weeks, "budsjett_omsetning")
  const ytdFjor = sum(data.weeks, "netto_omsetning_fjoraaret")
  const ytdBruttoPct = ratio(sum(data.weeks, "brutto_kr"), ytdOms)
  const ytdLonnPct = ratio(sum(data.weeks, "lonn_kr"), ytdOms)
  const ytdSvinnPct = ratio(sum(data.weeks, "svinn_total"), ytdOms)

  const importedLabel = data.importedAt
    ? new Date(data.importedAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
    : null

  // Serialiserbar view-modell inn til klient-presentasjonen. Bevarer samme
  // datafelter/utregninger som før — kun presentasjonen er flyttet.
  const view: KpiView = {
    storeName: data.storeName,
    year: data.year,
    latestWeek: data.latestWeek,
    importedLabel,
    oms,
    vsBudsjett: diffPct(oms, budOms),
    vsFjor: diffPct(oms, fjor),
    brutto,
    budBrutto,
    bruttoDeltaPp: brutto !== null && budBrutto !== null ? brutto - budBrutto : null,
    ytdBruttoPct,
    lonn,
    budLonn,
    lonnDeltaPp: lonn !== null && budLonn !== null ? lonn - budLonn : null,
    ytdLonnPct,
    svinn,
    svinnAvOmsPct: ratio(svinn, oms),
    ytdSvinnPct,
    svinnKommentert: data.svinn
      ? { prosent: data.svinn.prosent, kommentert: data.svinn.kommentert, ikke_kommentert: data.svinn.ikke_kommentert }
      : null,
    points: data.weeks.map((w) => ({ uke: w.uke, netto: w.netto_omsetning ?? 0, budsjett: w.budsjett_omsetning ?? 0 })),
    ytdOms,
    ytdVsBudsjett: diffPct(ytdOms, ytdBud),
    ytdVsFjor: diffPct(ytdOms, ytdFjor),
  }

  return <StoreKpiScreen view={view} />
}
