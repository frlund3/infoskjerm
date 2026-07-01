"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useOrientation } from "@/app/widget/_shared/use-orientation"
import { AutoReload } from "@/app/widget/_shared/auto-reload"

/**
 * Client-presentasjon for det interne butikk-KPI-panelet. Server-siden
 * (page.tsx) henter data + regner ut avledede tall og sender inn et rent,
 * serialiserbart `KpiView`. Her velges layout ut fra iframe-orienteringen:
 *
 *  - Liggende (16:9): to-kolonne split — hero-omsetning + nøkkeltall til venstre,
 *    trend-graf til høyre, YTD-stripe under. Beholder dagens tetthet, men i
 *    container-query-enheter (cqw/cqh/cqmin) så tallene aldri klippes.
 *  - Stående (9:16): alt stablet vertikalt — stor hero-omsetning øverst, deretter
 *    nøkkeltall, svinn, trend-graf og YTD nederst. Store, lesbare tall som fyller
 *    hele høyden.
 *
 * Alt skaleres med container-query-enheter (containerType: "size" på ytre boks)
 * så det er oppløsnings-uavhengig og skarpt på alle skjermer.
 */

const GREEN = "#16a34a"
const RED = "#ef4444"
const AMBER = "#fbbf24"
const MUTED = "rgba(255,255,255,.55)"
const SURFACE = "rgba(255,255,255,.05)"
const SURFACE_BORDER = "1px solid rgba(255,255,255,.08)"

// ---------- Serialiserbar view-modell fra server (page.tsx) ----------

export interface KpiWeekPoint {
  uke: number
  netto: number
  budsjett: number
}

export interface KpiView {
  storeName: string
  year: number
  latestWeek: number
  importedLabel: string | null
  // Hero (siste uke)
  oms: number | null
  vsBudsjett: number | null
  vsFjor: number | null
  // Nøkkeltall
  brutto: number | null
  budBrutto: number | null
  bruttoDeltaPp: number | null
  ytdBruttoPct: number | null
  lonn: number | null
  budLonn: number | null
  lonnDeltaPp: number | null
  ytdLonnPct: number | null
  // Svinn
  svinn: number | null
  svinnAvOmsPct: number | null
  ytdSvinnPct: number | null
  svinnKommentert: { prosent: number | null; kommentert: number; ikke_kommentert: number } | null
  // Trend
  points: KpiWeekPoint[]
  // YTD
  ytdOms: number
  ytdVsBudsjett: number | null
  ytdVsFjor: number | null
}

// ---------- Formattering (klient-lokal, matcher server-helpers) ----------

function fmtKr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–"
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mill`
  return value.toLocaleString("nb-NO", { maximumFractionDigits: 0 })
}

function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  return `${value.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

/**
 * Teller et tall opp fra 0 til `value` ved mount (ease-out) for litt wow på
 * KPI-panelet. Selvstendig norsk tusenskille-formattering så det funker som
 * en klient-øy. Eksponert for bakoverkompatibilitet (page.tsx importerte den).
 */
export function CountUp({ value, suffix = "", digits = 0 }: { value: number | null; suffix?: string; digits?: number }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (value == null) return
    let raf = 0
    let start = 0
    const dur = 1300
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  if (value == null) return <>–</>
  return <>{n.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })}{suffix}</>
}

// ---------- Delte små byggeklosser ----------

function deltaColor(value: number | null, goodWhenPositive = true): string {
  if (value === null) return MUTED
  return value >= 0 === goodWhenPositive ? GREEN : RED
}

function Delta({ value, suffix = " %", goodWhenPositive = true, digits = 1, size }: { value: number | null; suffix?: string; goodWhenPositive?: boolean; digits?: number; size: string }) {
  if (value === null) return null
  const up = value >= 0
  return (
    <span style={{ color: deltaColor(value, goodWhenPositive), fontWeight: 800, fontSize: size }}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })}{suffix}
    </span>
  )
}

function TrendChart({ points }: { points: KpiWeekPoint[] }) {
  const W = 1760, H = 300, padT = 16, padB = 46, padL = 12, padR = 12
  const vals = points.map((p) => p.netto)
  const budgets = points.map((p) => p.budsjett)
  const maxV = Math.max(...vals, ...budgets, 1)
  const n = points.length
  const slot = (W - padL - padR) / Math.max(n, 1)
  const barW = Math.min(slot * 0.6, 46)
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB)
  const x = (i: number) => padL + i * slot + slot / 2
  const budgetPoints = budgets.map((b, i) => `${x(i)},${y(b)}`).join(" ")
  const labelEvery = Math.max(1, Math.ceil(n / 12))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      {points.map((p, i) => {
        const top = y(p.netto)
        return <rect key={i} x={x(i) - barW / 2} y={top} width={barW} height={H - padB - top} rx={6} fill="url(#grad)" />
      })}
      <polyline points={budgetPoints} fill="none" stroke={AMBER} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
      {points.map((p, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={`l${i}`} x={x(i)} y={H - 16} textAnchor="middle" fill={MUTED} fontSize={20} fontFamily="Arial">
            {p.uke}
          </text>
        ) : null
      )}
    </svg>
  )
}

// ---------- LANDSKAP (16:9) — to-kolonne split ----------

function LandscapeCard({ label, children, flex = 1, labelSize, pad }: { label: string; children: React.ReactNode; flex?: number; labelSize: string; pad: string }) {
  return (
    <div style={{ flex, background: SURFACE, border: SURFACE_BORDER, borderRadius: "1.8cqmin", padding: pad, display: "flex", flexDirection: "column", gap: "0.6cqmin", minWidth: 0 }}>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15cqmin", textTransform: "uppercase", color: MUTED }}>{label}</div>
      {children}
    </div>
  )
}

function LandscapeLayout({ v }: { v: KpiView }) {
  return (
    <main style={{ ...frameBase, padding: "3.4cqmin", gap: "1.8cqmin" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", gap: "1.6cqmin", flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "3.6cqmin", fontWeight: 900, margin: 0, lineHeight: 1 }}>{v.storeName}</h1>
        <span style={{ fontSize: "2cqmin", fontWeight: 700, color: GREEN }}>Uke {v.latestWeek} · {v.year}</span>
        <span style={{ marginLeft: "auto", fontSize: "1.5cqmin", color: MUTED }}>{v.importedLabel ? `Oppdatert ${v.importedLabel}` : ""}</span>
      </header>

      {/* Hovedrad: venstre nøkkeltall (~40%) | høyre graf (~60%) */}
      <section style={{ display: "flex", gap: "1.8cqmin", flex: "1 1 auto", minHeight: 0 }}>
        {/* VENSTRE: omsetning-hero + nøkkeltall stablet */}
        <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", gap: "1.6cqmin", minWidth: 0 }}>
          <LandscapeCard label="Omsetning · siste uke" flex={1.4} labelSize="1.7cqmin" pad="2.4cqmin">
            <div style={{ display: "flex", alignItems: "flex-end", gap: "1cqmin" }}>
              <span style={{ fontSize: "6.6cqmin", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.15cqmin" }}><CountUp value={v.oms} /></span>
              <span style={{ fontSize: "2.4cqmin", color: MUTED, marginBottom: "0.5cqmin" }}>kr</span>
            </div>
            <div style={{ display: "flex", gap: "2cqmin", marginTop: "0.6cqmin", flexWrap: "wrap" }}>
              <span style={{ color: MUTED, fontSize: "1.9cqmin" }}>vs budsjett <Delta value={v.vsBudsjett} size="1.9cqmin" /></span>
              <span style={{ color: MUTED, fontSize: "1.9cqmin" }}>vs i fjor <Delta value={v.vsFjor} size="1.9cqmin" /></span>
            </div>
          </LandscapeCard>
          <div style={{ display: "flex", gap: "1.6cqmin", flex: 1, minHeight: 0 }}>
            <LandscapeCard label="Bruttomargin" labelSize="1.6cqmin" pad="2cqmin">
              <div style={{ fontSize: "4.4cqmin", fontWeight: 900 }}><CountUp value={v.brutto} suffix=" %" digits={1} /></div>
              <div style={{ fontSize: "1.6cqmin", color: MUTED }}>bud {fmtPct(v.budBrutto)} · <Delta value={v.bruttoDeltaPp} suffix=" pp" size="1.6cqmin" /></div>
              <div style={{ fontSize: "1.5cqmin", color: MUTED }}>i år {fmtPct(v.ytdBruttoPct)}</div>
            </LandscapeCard>
            <LandscapeCard label="Lønn" labelSize="1.6cqmin" pad="2cqmin">
              <div style={{ fontSize: "4.4cqmin", fontWeight: 900 }}><CountUp value={v.lonn} suffix=" %" digits={1} /></div>
              <div style={{ fontSize: "1.6cqmin", color: MUTED }}>bud {fmtPct(v.budLonn)} · <Delta value={v.lonnDeltaPp} suffix=" pp" goodWhenPositive={false} size="1.6cqmin" /></div>
              <div style={{ fontSize: "1.5cqmin", color: MUTED }}>i år {fmtPct(v.ytdLonnPct)}</div>
            </LandscapeCard>
          </div>
          <LandscapeCard label="Svinn · siste uke" labelSize="1.6cqmin" pad="2cqmin">
            <div style={{ display: "flex", alignItems: "baseline", gap: "1.4cqmin", flexWrap: "wrap" }}>
              <span style={{ fontSize: "3.6cqmin", fontWeight: 900 }}><CountUp value={v.svinn} /> kr</span>
              <span style={{ fontSize: "1.6cqmin", color: MUTED }}>{fmtPct(v.svinnAvOmsPct)} av oms · i år {fmtPct(v.ytdSvinnPct)}</span>
              {v.svinnKommentert && (
                <span style={{ marginLeft: "auto", fontSize: "1.6cqmin", color: MUTED }}>
                  kommentert <b style={{ color: (v.svinnKommentert.prosent ?? 0) >= 80 ? GREEN : AMBER }}>{fmtPct(v.svinnKommentert.prosent, 0)}</b>
                </span>
              )}
            </div>
          </LandscapeCard>
        </div>

        {/* HØYRE: trend-graf */}
        <div style={{ flex: "1 1 auto", minWidth: 0, background: SURFACE, border: SURFACE_BORDER, borderRadius: "1.8cqmin", padding: "2.4cqmin", display: "flex", flexDirection: "column", gap: "1cqmin" }}>
          <div style={{ fontSize: "1.7cqmin", fontWeight: 700, letterSpacing: "0.15cqmin", textTransform: "uppercase", color: MUTED }}>
            Omsetning per uke <span style={{ color: AMBER, fontWeight: 600 }}>— — budsjett</span>
          </div>
          <div style={{ flex: "1 1 auto", minHeight: 0 }}>
            <TrendChart points={v.points} />
          </div>
        </div>
      </section>

      {/* YTD-stripe */}
      <footer style={{ display: "flex", gap: "2.6cqmin", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1.4cqmin", flex: "0 0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.7cqmin", fontWeight: 700, letterSpacing: "0.15cqmin", textTransform: "uppercase", color: MUTED }}>Hittil i år</span>
        <span style={{ fontSize: "2.8cqmin", fontWeight: 900 }}>{fmtKr(v.ytdOms)} kr</span>
        <span style={{ fontSize: "1.9cqmin", color: MUTED }}>vs budsjett <Delta value={v.ytdVsBudsjett} size="1.9cqmin" /></span>
        <span style={{ fontSize: "1.9cqmin", color: MUTED }}>vs i fjor <Delta value={v.ytdVsFjor} size="1.9cqmin" /></span>
      </footer>
    </main>
  )
}

// ---------- PORTRETT (9:16) — vertikal stabling ----------

function PortraitCard({ label, children, pad = "3cqh" }: { label: string; children: React.ReactNode; pad?: string }) {
  return (
    <div style={{ background: SURFACE, border: SURFACE_BORDER, borderRadius: "2cqh", padding: pad, display: "flex", flexDirection: "column", gap: "0.8cqh", minWidth: 0 }}>
      <div style={{ fontSize: "1.5cqh", fontWeight: 700, letterSpacing: "0.2cqh", textTransform: "uppercase", color: MUTED }}>{label}</div>
      {children}
    </div>
  )
}

function PortraitLayout({ v }: { v: KpiView }) {
  return (
    <main style={{ ...frameBase, padding: "4cqh 3.5cqw", gap: "2.2cqh" }}>
      {/* Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: "0.6cqh", flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "4.2cqh", fontWeight: 900, margin: 0, lineHeight: 1 }}>{v.storeName}</h1>
        <div style={{ display: "flex", alignItems: "baseline", gap: "2cqw", flexWrap: "wrap" }}>
          <span style={{ fontSize: "2cqh", fontWeight: 700, color: GREEN }}>Uke {v.latestWeek} · {v.year}</span>
          <span style={{ fontSize: "1.5cqh", color: MUTED }}>{v.importedLabel ? `Oppdatert ${v.importedLabel}` : ""}</span>
        </div>
      </header>

      {/* Hero: omsetning — fyller bredden, stort tall */}
      <section style={{ background: `linear-gradient(135deg, rgba(22,163,74,.16), ${SURFACE})`, border: SURFACE_BORDER, borderRadius: "2.4cqh", padding: "3.4cqh 4cqw", flex: "0 0 auto" }}>
        <div style={{ fontSize: "1.7cqh", fontWeight: 700, letterSpacing: "0.2cqh", textTransform: "uppercase", color: MUTED }}>Omsetning · siste uke</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5cqw", marginTop: "1cqh" }}>
          <span style={{ fontSize: "9cqh", fontWeight: 900, lineHeight: 0.86, letterSpacing: "-0.3cqh" }}><CountUp value={v.oms} /></span>
          <span style={{ fontSize: "3cqh", color: MUTED, marginBottom: "1cqh" }}>kr</span>
        </div>
        <div style={{ display: "flex", gap: "5cqw", marginTop: "1.6cqh", flexWrap: "wrap" }}>
          <span style={{ color: MUTED, fontSize: "2cqh" }}>vs budsjett <Delta value={v.vsBudsjett} size="2cqh" /></span>
          <span style={{ color: MUTED, fontSize: "2cqh" }}>vs i fjor <Delta value={v.vsFjor} size="2cqh" /></span>
        </div>
      </section>

      {/* Nøkkeltall: bruttomargin + lønn side ved side */}
      <section style={{ display: "flex", gap: "3cqw", flex: "0 0 auto" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PortraitCard label="Bruttomargin">
            <div style={{ fontSize: "5.4cqh", fontWeight: 900, lineHeight: 1 }}><CountUp value={v.brutto} suffix=" %" digits={1} /></div>
            <div style={{ fontSize: "1.7cqh", color: MUTED }}>bud {fmtPct(v.budBrutto)} · <Delta value={v.bruttoDeltaPp} suffix=" pp" size="1.7cqh" /></div>
            <div style={{ fontSize: "1.5cqh", color: MUTED }}>i år {fmtPct(v.ytdBruttoPct)}</div>
          </PortraitCard>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PortraitCard label="Lønn">
            <div style={{ fontSize: "5.4cqh", fontWeight: 900, lineHeight: 1 }}><CountUp value={v.lonn} suffix=" %" digits={1} /></div>
            <div style={{ fontSize: "1.7cqh", color: MUTED }}>bud {fmtPct(v.budLonn)} · <Delta value={v.lonnDeltaPp} suffix=" pp" goodWhenPositive={false} size="1.7cqh" /></div>
            <div style={{ fontSize: "1.5cqh", color: MUTED }}>i år {fmtPct(v.ytdLonnPct)}</div>
          </PortraitCard>
        </div>
      </section>

      {/* Svinn */}
      <section style={{ flex: "0 0 auto" }}>
        <PortraitCard label="Svinn · siste uke">
          <div style={{ display: "flex", alignItems: "baseline", gap: "3cqw", flexWrap: "wrap" }}>
            <span style={{ fontSize: "4.6cqh", fontWeight: 900, lineHeight: 1 }}><CountUp value={v.svinn} /> kr</span>
            <span style={{ fontSize: "1.7cqh", color: MUTED }}>{fmtPct(v.svinnAvOmsPct)} av oms · i år {fmtPct(v.ytdSvinnPct)}</span>
            {v.svinnKommentert && (
              <span style={{ marginLeft: "auto", fontSize: "1.9cqh", color: MUTED }}>
                kommentert <b style={{ color: (v.svinnKommentert.prosent ?? 0) >= 80 ? GREEN : AMBER, fontSize: "2.4cqh" }}>{fmtPct(v.svinnKommentert.prosent, 0)}</b>
              </span>
            )}
          </div>
        </PortraitCard>
      </section>

      {/* Trend-graf: fyller resterende høyde */}
      <section style={{ flex: "1 1 auto", minHeight: "18cqh", display: "flex", flexDirection: "column", gap: "1cqh" }}>
        <div style={{ fontSize: "1.6cqh", fontWeight: 700, letterSpacing: "0.2cqh", textTransform: "uppercase", color: MUTED }}>
          Omsetning per uke <span style={{ color: AMBER, fontWeight: 600 }}>— — budsjett</span>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, background: SURFACE, border: SURFACE_BORDER, borderRadius: "2cqh", padding: "2.4cqh 2cqw" }}>
          <TrendChart points={v.points} />
        </div>
      </section>

      {/* YTD-stripe */}
      <footer style={{ display: "flex", gap: "4cqw", alignItems: "baseline", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1.8cqh", flex: "0 0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.6cqh", fontWeight: 700, letterSpacing: "0.2cqh", textTransform: "uppercase", color: MUTED }}>Hittil i år</span>
        <span style={{ fontSize: "3cqh", fontWeight: 900 }}>{fmtKr(v.ytdOms)} kr</span>
        <span style={{ fontSize: "1.9cqh", color: MUTED }}>bud <Delta value={v.ytdVsBudsjett} size="1.9cqh" /></span>
        <span style={{ fontSize: "1.9cqh", color: MUTED }}>fjor <Delta value={v.ytdVsFjor} size="1.9cqh" /></span>
      </footer>
    </main>
  )
}

// ---------- Ytre ramme + skjerm-velger ----------

const frameBase: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  boxSizing: "border-box",
  containerType: "size",
  background: "linear-gradient(135deg,#0a0a0a,#141414)",
  color: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
}

export function StoreKpiScreen({ view }: { view: KpiView }) {
  const orientation = useOrientation()
  return (
    <>
      <AutoReload />
      {orientation === "portrait" ? <PortraitLayout v={view} /> : <LandscapeLayout v={view} />}
    </>
  )
}
