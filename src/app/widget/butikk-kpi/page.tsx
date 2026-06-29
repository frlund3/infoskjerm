import { fetchStoreKpi, kr, pct, ratio, diffPct, sum, type WeekKpi } from "@/lib/content/kpi"

/**
 * Staff-only KPI dashboard for a store — operational figures synced daily from
 * Gange-Rolv Drift. Shows the latest imported week + year-to-date, with a turnover
 * trend chart and the svinn comment rate. Never on customer-facing screens.
 *
 * Usage: /widget/butikk-kpi?store=<storeId>
 */

export const dynamic = "force-dynamic"

const GREEN = "#16a34a"
const RED = "#ef4444"
const MUTED = "rgba(255,255,255,.55)"

function deltaColor(value: number | null, goodWhenPositive = true): string {
  if (value === null) return MUTED
  const positive = value >= 0
  return positive === goodWhenPositive ? GREEN : RED
}

function Delta({ value, suffix = " %", goodWhenPositive = true, digits = 1 }: { value: number | null; suffix?: string; goodWhenPositive?: boolean; digits?: number }) {
  if (value === null) return null
  const up = value >= 0
  return (
    <span style={{ color: deltaColor(value, goodWhenPositive), fontWeight: 800 }}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })}{suffix}
    </span>
  )
}

function Card({ label, children, flex = 1 }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <div style={{ flex, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: 34, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>{label}</div>
      {children}
    </div>
  )
}

function TrendChart({ weeks }: { weeks: WeekKpi[] }) {
  const W = 1760, H = 300, padT = 16, padB = 46, padL = 12, padR = 12
  const vals = weeks.map((w) => w.netto_omsetning ?? 0)
  const budgets = weeks.map((w) => w.budsjett_omsetning ?? 0)
  const maxV = Math.max(...vals, ...budgets, 1)
  const n = weeks.length
  const slot = (W - padL - padR) / n
  const barW = Math.min(slot * 0.6, 46)
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB)
  const x = (i: number) => padL + i * slot + slot / 2
  const budgetPoints = budgets.map((b, i) => `${x(i)},${y(b)}`).join(" ")
  const labelEvery = Math.ceil(n / 12)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
      {weeks.map((w, i) => {
        const v = w.netto_omsetning ?? 0
        const top = y(v)
        return <rect key={i} x={x(i) - barW / 2} y={top} width={barW} height={H - padB - top} rx={6} fill="url(#grad)" />
      })}
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <polyline points={budgetPoints} fill="none" stroke="#fbbf24" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
      {weeks.map((w, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={`l${i}`} x={x(i)} y={H - 16} textAnchor="middle" fill={MUTED} fontSize={20} fontFamily="Arial">
            {w.uke}
          </text>
        ) : null
      )}
    </svg>
  )
}

export default async function StoreKpiPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const data = store ? await fetchStoreKpi(store) : null

  const frame: React.CSSProperties = {
    margin: 0,
    width: "100%",
    height: "100vh",
    boxSizing: "border-box",
    padding: 56,
    background: "linear-gradient(135deg,#0a0a0a,#141414)",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 26,
    overflow: "hidden",
  }

  if (!data) {
    return (
      <main style={{ ...frame, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: MUTED, fontSize: 40 }}>Ingen driftstall tilgjengelig</div>
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

  const importedLabel = data.importedAt
    ? new Date(data.importedAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
    : null

  return (
    <main style={frame}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <h1 style={{ fontSize: 52, fontWeight: 900, margin: 0 }}>{data.storeName}</h1>
        <span style={{ fontSize: 30, fontWeight: 700, color: GREEN }}>Uke {data.latestWeek} · {data.year}</span>
        <span style={{ marginLeft: "auto", fontSize: 22, color: MUTED }}>{importedLabel ? `Oppdatert ${importedLabel}` : ""}</span>
      </header>

      {/* Hero turnover + secondary cards */}
      <section style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
        <Card label="Omsetning · siste uke" flex={1.6}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <span style={{ fontSize: 96, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2 }}>{kr(oms)}</span>
            <span style={{ fontSize: 34, color: MUTED, marginBottom: 8 }}>kr</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 28, marginTop: 6 }}>
            <span style={{ color: MUTED }}>vs budsjett <Delta value={diffPct(oms, budOms)} /></span>
            <span style={{ color: MUTED }}>vs i fjor <Delta value={diffPct(oms, fjor)} /></span>
          </div>
        </Card>
        <Card label="Bruttomargin">
          <div style={{ fontSize: 64, fontWeight: 900 }}>{pct(brutto)}</div>
          <div style={{ fontSize: 24, color: MUTED }}>budsjett {pct(budBrutto)} · <Delta value={brutto !== null && budBrutto !== null ? brutto - budBrutto : null} suffix=" pp" /></div>
        </Card>
        <Card label="Lønnsandel">
          <div style={{ fontSize: 64, fontWeight: 900 }}>{pct(lonn)}</div>
          <div style={{ fontSize: 24, color: MUTED }}>budsjett {pct(budLonn)} · <Delta value={lonn !== null && budLonn !== null ? lonn - budLonn : null} suffix=" pp" goodWhenPositive={false} /></div>
        </Card>
      </section>

      {/* Svinn + svinn kommentert */}
      <section style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
        <Card label="Svinn · siste uke">
          <div style={{ fontSize: 56, fontWeight: 900 }}>{kr(svinn)} kr</div>
          <div style={{ fontSize: 24, color: MUTED }}>{pct(ratio(svinn, oms))} av omsetning</div>
        </Card>
        {data.svinn && (
          <Card label="Svinn kommentert · 10 uker" flex={1.4}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: (data.svinn.prosent ?? 0) >= 80 ? GREEN : "#fbbf24" }}>{pct(data.svinn.prosent, 0)}</span>
              <span style={{ fontSize: 28, color: MUTED }}>
                {data.svinn.kommentert} kommentert · {data.svinn.ikke_kommentert} ikke
              </span>
            </div>
          </Card>
        )}
      </section>

      {/* Trend chart */}
      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>
          Omsetning per uke <span style={{ color: "#fbbf24", fontWeight: 600 }}>— — budsjett</span>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0 }}>
          <TrendChart weeks={data.weeks} />
        </div>
      </section>

      {/* YTD footer */}
      <footer style={{ display: "flex", gap: 40, alignItems: "center", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 22, flex: "0 0 auto" }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Hittil i år</span>
        <span style={{ fontSize: 40, fontWeight: 900 }}>{kr(ytdOms)} kr</span>
        <span style={{ fontSize: 28, color: MUTED }}>vs budsjett <Delta value={diffPct(ytdOms, ytdBud)} /></span>
        <span style={{ fontSize: 28, color: MUTED }}>vs i fjor <Delta value={diffPct(ytdOms, ytdFjor)} /></span>
      </footer>
    </main>
  )
}
