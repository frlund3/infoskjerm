import { fetchStoreKpi } from "@/lib/content/kpi"
import { StoreKpiScreen } from "./store-kpi-screen"

/**
 * Staff-only KPI dashboard for a store — operational figures synced daily from
 * Gange-Rolv Drift. Shows the latest imported week + year-to-date, with a turnover
 * trend chart and the svinn comment rate. Never on customer-facing screens.
 *
 * Data hentes her (server, service role); presentasjonen (StoreKpiScreen) er en
 * klient-komponent som velger stående/liggende layout etter skjermforholdet.
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
        }}
      >
        <div style={{ color: MUTED, fontSize: 40 }}>Ingen driftstall tilgjengelig</div>
      </main>
    )
  }

  return <StoreKpiScreen data={data} />
}
