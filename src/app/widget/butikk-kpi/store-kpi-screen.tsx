"use client"

import { useEffect, useState } from "react"
import type { StoreKpi, WeekKpi } from "@/lib/content/kpi"
import { kr, pct, ratio, diffPct, sum } from "@/lib/content/kpi-format"
import { CountUp } from "./count-up"
import { AutoReload } from "@/app/widget/_shared/auto-reload"
import { SPACE, RADIUS } from "@/app/widget/_shared/tokens"

/**
 * Klient-presentasjon for butikkens KPI-dashboard. Oppdager egen orientering
 * (vindusforhold — samme primitiv som kiosk-auto/topbar) og velger layout:
 *  · liggende (1920×1080): den etablerte dashboard-raden (uendret).
 *  · stående (1080×1920): omflytt til vertikal stabling så tallene fyller den
 *    smale, høye interne skjermen (Mobile AS kjører stående internskjermer).
 * Data hentes server-side i page.tsx og sendes hit som ren, serialiserbar StoreKpi.
 */

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

/** Ett faktakort. `big` skalerer opp for den stående, høyere skjermen. */
function Card({ label, children, flex = 1, big = false }: { label: string; children: React.ReactNode; flex?: number; big?: boolean }) {
  return (
    <div
      style={{
        flex,
        background: "rgba(255,255,255,.05)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: big ? RADIUS.lg : RADIUS.md,
        padding: big ? SPACE.lg : 34,
        display: "flex",
        flexDirection: "column",
        gap: big ? 14 : 10,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: big ? 30 : 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>{label}</div>
      {children}
    </div>
  )
}

/** Omsetning-per-uke søylediagram + budsjettlinje. `W`/`H` styrer viewBox-forhold. */
function TrendChart({ weeks, W = 1760, H = 300 }: { weeks: WeekKpi[]; W?: number; H?: number }) {
  const padT = 16, padB = 46, padL = 12, padR = 12
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
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
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

interface Derived {
  oms: number | null
  budOms: number | null
  fjor: number | null
  brutto: number | null
  budBrutto: number | null
  lonn: number | null
  budLonn: number | null
  svinn: number | null
  ytdOms: number
  ytdBud: number
  ytdFjor: number
  ytdBruttoPct: number | null
  ytdLonnPct: number | null
  ytdSvinnPct: number | null
  importedLabel: string | null
}

function derive(data: StoreKpi): Derived {
  const last = data.weeks[data.weeks.length - 1]
  const oms = last.netto_omsetning
  const budOms = last.budsjett_omsetning
  const ytdOms = sum(data.weeks, "netto_omsetning")
  const ytdSvinnKr = sum(data.weeks, "svinn_total")
  return {
    oms,
    budOms,
    fjor: last.netto_omsetning_fjoraaret,
    brutto: ratio(last.brutto_kr, oms),
    budBrutto: ratio(last.budsjett_brutto_kr, budOms),
    lonn: ratio(last.lonn_kr, oms),
    budLonn: ratio(last.budsjett_lonn, budOms),
    svinn: last.svinn_total,
    ytdOms,
    ytdBud: sum(data.weeks, "budsjett_omsetning"),
    ytdFjor: sum(data.weeks, "netto_omsetning_fjoraaret"),
    ytdBruttoPct: ratio(sum(data.weeks, "brutto_kr"), ytdOms),
    ytdLonnPct: ratio(sum(data.weeks, "lonn_kr"), ytdOms),
    ytdSvinnPct: ratio(ytdSvinnKr, ytdOms),
    importedLabel: data.importedAt
      ? new Date(data.importedAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
      : null,
  }
}

/* ---------------- LIGGENDE (uendret etablert dashboard) ---------------- */

function LandscapeKpi({ data, d }: { data: StoreKpi; d: Derived }) {
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
  return (
    <main style={frame}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <h1 style={{ fontSize: 52, fontWeight: 900, margin: 0 }}>{data.storeName}</h1>
        <span style={{ fontSize: 30, fontWeight: 700, color: GREEN }}>Uke {data.latestWeek} · {data.year}</span>
        <span style={{ marginLeft: "auto", fontSize: 22, color: MUTED }}>{d.importedLabel ? `Oppdatert ${d.importedLabel}` : ""}</span>
      </header>

      <section style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
        <Card label="Omsetning · siste uke" flex={1.6}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <span style={{ fontSize: 96, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2 }}><CountUp value={d.oms} /></span>
            <span style={{ fontSize: 34, color: MUTED, marginBottom: 8 }}>kr</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 28, marginTop: 6 }}>
            <span style={{ color: MUTED }}>vs budsjett <Delta value={diffPct(d.oms, d.budOms)} /></span>
            <span style={{ color: MUTED }}>vs i fjor <Delta value={diffPct(d.oms, d.fjor)} /></span>
          </div>
        </Card>
        <Card label="Bruttomargin">
          <div style={{ fontSize: 64, fontWeight: 900 }}><CountUp value={d.brutto} suffix=" %" digits={1} /></div>
          <div style={{ fontSize: 24, color: MUTED }}>budsjett {pct(d.budBrutto)} · <Delta value={d.brutto !== null && d.budBrutto !== null ? d.brutto - d.budBrutto : null} suffix=" pp" /></div>
          <div style={{ fontSize: 22, color: MUTED }}>hittil i år {pct(d.ytdBruttoPct)}</div>
        </Card>
        <Card label="Lønn">
          <div style={{ fontSize: 64, fontWeight: 900 }}><CountUp value={d.lonn} suffix=" %" digits={1} /></div>
          <div style={{ fontSize: 24, color: MUTED }}>budsjett {pct(d.budLonn)} · <Delta value={d.lonn !== null && d.budLonn !== null ? d.lonn - d.budLonn : null} suffix=" pp" goodWhenPositive={false} /></div>
          <div style={{ fontSize: 22, color: MUTED }}>hittil i år {pct(d.ytdLonnPct)}</div>
        </Card>
      </section>

      <section style={{ display: "flex", gap: 24, flex: "0 0 auto" }}>
        <Card label="Svinn · siste uke">
          <div style={{ fontSize: 56, fontWeight: 900 }}><CountUp value={d.svinn} /> kr</div>
          <div style={{ fontSize: 24, color: MUTED }}>{pct(ratio(d.svinn, d.oms))} av omsetning · hittil i år {pct(d.ytdSvinnPct)}</div>
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

      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>
          Omsetning per uke <span style={{ color: "#fbbf24", fontWeight: 600 }}>— — budsjett</span>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0 }}>
          <TrendChart weeks={data.weeks} />
        </div>
      </section>

      <footer style={{ display: "flex", gap: 40, alignItems: "center", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 22, flex: "0 0 auto" }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Hittil i år</span>
        <span style={{ fontSize: 40, fontWeight: 900 }}>{kr(d.ytdOms)} kr</span>
        <span style={{ fontSize: 28, color: MUTED }}>vs budsjett <Delta value={diffPct(d.ytdOms, d.ytdBud)} /></span>
        <span style={{ fontSize: 28, color: MUTED }}>vs i fjor <Delta value={diffPct(d.ytdOms, d.ytdFjor)} /></span>
      </footer>
    </main>
  )
}

/* ---------------- STÅENDE (1080×1920, vertikal stabling) ---------------- */

function PortraitKpi({ data, d }: { data: StoreKpi; d: Derived }) {
  const frame: React.CSSProperties = {
    margin: 0,
    width: "100%",
    height: "100vh",
    boxSizing: "border-box",
    padding: SPACE.xl,
    background: "linear-gradient(160deg,#0a0a0a,#141414)",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: SPACE.md,
    overflow: "hidden",
  }
  return (
    <main style={frame}>
      {/* Header: navn over, uke + oppdatert under */}
      <header style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, flex: "0 0 auto" }}>
        <h1 style={{ fontSize: 84, fontWeight: 900, margin: 0, lineHeight: 1 }}>{data.storeName}</h1>
        <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.md, flexWrap: "wrap" }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: GREEN }}>Uke {data.latestWeek} · {data.year}</span>
          {d.importedLabel && <span style={{ fontSize: 28, color: MUTED }}>Oppdatert {d.importedLabel}</span>}
        </div>
      </header>

      {/* Hero: omsetning */}
      <Card label="Omsetning · siste uke" big flex={0}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: SPACE.sm }}>
          <span style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.86, letterSpacing: -3 }}><CountUp value={d.oms} /></span>
          <span style={{ fontSize: 46, color: MUTED, marginBottom: 12 }}>kr</span>
        </div>
        <div style={{ display: "flex", gap: SPACE.lg, fontSize: 36, marginTop: SPACE.xs }}>
          <span style={{ color: MUTED }}>vs budsjett <Delta value={diffPct(d.oms, d.budOms)} /></span>
          <span style={{ color: MUTED }}>vs i fjor <Delta value={diffPct(d.oms, d.fjor)} /></span>
        </div>
      </Card>

      {/* Bruttomargin + Lønn side om side */}
      <section style={{ display: "flex", gap: SPACE.md, flex: "0 0 auto" }}>
        <Card label="Bruttomargin" big>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9 }}><CountUp value={d.brutto} suffix=" %" digits={1} /></div>
          <div style={{ fontSize: 30, color: MUTED }}>budsjett {pct(d.budBrutto)}</div>
          <div style={{ fontSize: 30 }}><Delta value={d.brutto !== null && d.budBrutto !== null ? d.brutto - d.budBrutto : null} suffix=" pp" /> <span style={{ color: MUTED }}>· i år {pct(d.ytdBruttoPct)}</span></div>
        </Card>
        <Card label="Lønn" big>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9 }}><CountUp value={d.lonn} suffix=" %" digits={1} /></div>
          <div style={{ fontSize: 30, color: MUTED }}>budsjett {pct(d.budLonn)}</div>
          <div style={{ fontSize: 30 }}><Delta value={d.lonn !== null && d.budLonn !== null ? d.lonn - d.budLonn : null} suffix=" pp" goodWhenPositive={false} /> <span style={{ color: MUTED }}>· i år {pct(d.ytdLonnPct)}</span></div>
        </Card>
      </section>

      {/* Svinn siste uke + svinn kommentert */}
      <section style={{ display: "flex", gap: SPACE.md, flex: "0 0 auto" }}>
        <Card label="Svinn · siste uke" big>
          <div style={{ fontSize: 72, fontWeight: 900 }}><CountUp value={d.svinn} /> kr</div>
          <div style={{ fontSize: 30, color: MUTED }}>{pct(ratio(d.svinn, d.oms))} av omsetning</div>
          <div style={{ fontSize: 28, color: MUTED }}>hittil i år {pct(d.ytdSvinnPct)}</div>
        </Card>
        {data.svinn && (
          <Card label="Svinn kommentert · 10 uker" big>
            <div style={{ fontSize: 72, fontWeight: 900, color: (data.svinn.prosent ?? 0) >= 80 ? GREEN : "#fbbf24" }}>{pct(data.svinn.prosent, 0)}</div>
            <div style={{ fontSize: 30, color: MUTED }}>{data.svinn.kommentert} kommentert</div>
            <div style={{ fontSize: 28, color: MUTED }}>{data.svinn.ikke_kommentert} ikke kommentert</div>
          </Card>
        )}
      </section>

      {/* Trend – får rikelig vertikal plass i stående */}
      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: SPACE.xs }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>
          Omsetning per uke <span style={{ color: "#fbbf24", fontWeight: 600 }}>— — budsjett</span>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0 }}>
          <TrendChart weeks={data.weeks} W={940} H={420} />
        </div>
      </section>

      {/* YTD-bunn */}
      <footer style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: SPACE.md, flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.md }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Hittil i år</span>
          <span style={{ fontSize: 60, fontWeight: 900 }}>{kr(d.ytdOms)} kr</span>
        </div>
        <div style={{ display: "flex", gap: SPACE.lg, fontSize: 34 }}>
          <span style={{ color: MUTED }}>vs budsjett <Delta value={diffPct(d.ytdOms, d.ytdBud)} /></span>
          <span style={{ color: MUTED }}>vs i fjor <Delta value={diffPct(d.ytdOms, d.ytdFjor)} /></span>
        </div>
      </footer>
    </main>
  )
}

export function StoreKpiScreen({ data }: { data: StoreKpi }) {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth >= window.innerHeight)
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [])

  const d = derive(data)

  // Hold svart til orienteringen er kjent (unngå feil layout-glimt ved oppstart).
  if (isLandscape === null) {
    return <main style={{ position: "fixed", inset: 0, background: "#0a0a0a" }} />
  }

  return (
    <>
      <AutoReload />
      {isLandscape ? <LandscapeKpi data={data} d={d} /> : <PortraitKpi data={data} d={d} />}
    </>
  )
}
