"use client"

import { useEffect, useState } from "react"
import { kr, pct, diffPct } from "@/lib/content/kpi-format"
import { AutoReload } from "@/app/widget/_shared/auto-reload"
import { SPACE, RADIUS } from "@/app/widget/_shared/tokens"

/**
 * Klient-presentasjon for alle-butikker-oversikten. Oppdager egen orientering og
 * velger layout:
 *  · liggende (1920×1080): den brede 8-kolonners tabellen (uendret).
 *  · stående (1080×1920): en tabell er for bred → omflytt til to-linjers kort per
 *    butikk (rang + navn + omsetning over; delta + marginer under).
 * Data (rows, hero-totaler) beregnes server-side i page.tsx.
 */

const GREEN = "#16a34a"
const RED = "#ef4444"
const MUTED = "rgba(255,255,255,.5)"

/** Tallene som vises per butikk, allerede løst for valgt periode (uke/hittil-i-år). */
export interface RowView {
  storeName: string
  omsetning: number | null
  budsjett: number | null
  fjor: number | null
  bruttoPct: number | null
  lonnPct: number | null
  svinnPct: number | null
}

export interface KpiOverviewData {
  rows: RowView[]
  ytd: boolean
  year: number
  latestWeek: number
  heroOms: number | null
  heroBud: number | null
  heroFjor: number | null
}

function Delta({ value, digits = 1 }: { value: number | null; digits?: number }) {
  if (value === null) return <span style={{ color: MUTED }}>–</span>
  const up = value >= 0
  return (
    <span style={{ color: up ? GREEN : RED, fontWeight: 800 }}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %
    </span>
  )
}

function medalFor(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null
}

/* ---------------- LIGGENDE (uendret bred tabell) ---------------- */

function HeadCell({ children, width }: { children: React.ReactNode; width: number }) {
  return <div style={{ width, flex: width ? "0 0 auto" : "1 1 auto", textAlign: "right", fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>{children}</div>
}

function LandscapeRow({ row, rank }: { row: RowView; rank: number }) {
  const dBud = diffPct(row.omsetning, row.budsjett)
  const dFjor = diffPct(row.omsetning, row.fjor)
  const medal = medalFor(rank)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px", flex: "1 1 0", minHeight: 0, borderRadius: 14, background: rank % 2 ? "transparent" : "rgba(255,255,255,.035)" }}>
      <div style={{ width: 44, flex: "0 0 auto", fontSize: 26, fontWeight: 800, color: MUTED, textAlign: "center" }}>{medal ?? rank}</div>
      <div style={{ flex: "1 1 auto", minWidth: 0, fontSize: 26, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.storeName}</div>
      <div style={{ width: 230, flex: "0 0 auto", textAlign: "right", fontSize: 28, fontWeight: 900 }}>{kr(row.omsetning)} <span style={{ fontSize: 18, color: MUTED }}>kr</span></div>
      <div style={{ width: 150, flex: "0 0 auto", textAlign: "right", fontSize: 24 }}><Delta value={dBud} /></div>
      <div style={{ width: 150, flex: "0 0 auto", textAlign: "right", fontSize: 24 }}><Delta value={dFjor} /></div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.bruttoPct)}</div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.lonnPct)}</div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.svinnPct)}</div>
    </div>
  )
}

function LandscapeOverview({ data }: { data: KpiOverviewData }) {
  const frame: React.CSSProperties = {
    margin: 0,
    width: "100%",
    height: "100vh",
    boxSizing: "border-box",
    padding: "48px 56px",
    background: "linear-gradient(135deg,#0a0a0a,#141414)",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 22,
    overflow: "hidden",
  }
  return (
    <main style={frame}>
      <header style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
        <div>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>Gange-Rolv · alle butikker</div>
          <h1 style={{ fontSize: 46, fontWeight: 900, margin: "4px 0 0" }}>{data.ytd ? `Hittil i år · ${data.year}` : `Uke ${data.latestWeek} · ${data.year}`}</h1>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Total omsetning · {data.ytd ? "hittil i år" : "siste uke"}</div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{kr(data.heroOms)} <span style={{ fontSize: 26, color: MUTED }}>kr</span></div>
          <div style={{ fontSize: 24, marginTop: 4 }}>
            <span style={{ color: MUTED }}>vs budsjett </span><Delta value={diffPct(data.heroOms, data.heroBud)} />
            <span style={{ color: MUTED }}>  ·  vs i fjor </span><Delta value={diffPct(data.heroOms, data.heroFjor)} />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <div style={{ width: 44, flex: "0 0 auto" }} />
        <div style={{ flex: "1 1 auto", fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>Butikk</div>
        <HeadCell width={230}>Omsetning</HeadCell>
        <HeadCell width={150}>vs bud.</HeadCell>
        <HeadCell width={150}>vs fjor</HeadCell>
        <HeadCell width={130}>Brutto</HeadCell>
        <HeadCell width={130}>Lønn</HeadCell>
        <HeadCell width={130}>Svinn</HeadCell>
      </div>

      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 2, justifyContent: "space-between" }}>
        {data.rows.map((row, i) => (
          <LandscapeRow key={row.storeName} row={row} rank={i + 1} />
        ))}
      </section>
    </main>
  )
}

/* ---------------- STÅENDE (to-linjers kort per butikk) ---------------- */

function PortraitRow({ row, rank, dense }: { row: RowView; rank: number; dense: boolean }) {
  const dBud = diffPct(row.omsetning, row.budsjett)
  const dFjor = diffPct(row.omsetning, row.fjor)
  const medal = medalFor(rank)
  // Tettere skala når det er mange butikker (16 for Gange-Rolv), så ALT får plass
  // uten klipp — kiosk-skjermer kan ikke scrolle.
  const nameSize = dense ? 30 : 38
  const omsSize = dense ? 34 : 42
  const line2Size = dense ? 21 : 24
  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: dense ? 3 : 6,
        padding: `0 ${SPACE.md}px`,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        background: rank <= 3 ? "rgba(34,197,94,.07)" : rank % 2 ? "transparent" : "rgba(255,255,255,.035)",
        border: rank <= 3 ? "1px solid rgba(34,197,94,.20)" : "1px solid transparent",
      }}
    >
      {/* Linje 1: rang · navn · omsetning */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <div style={{ width: 52, flex: "0 0 auto", fontSize: dense ? 26 : 32, fontWeight: 800, color: MUTED, textAlign: "center" }}>{medal ?? rank}</div>
        <div style={{ flex: "1 1 auto", minWidth: 0, fontSize: nameSize, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.storeName}</div>
        <div style={{ flex: "0 0 auto", textAlign: "right", fontSize: omsSize, fontWeight: 900, whiteSpace: "nowrap" }}>{kr(row.omsetning)} <span style={{ fontSize: 22, color: MUTED }}>kr</span></div>
      </div>
      {/* Linje 2: deltaer venstre, marginer høyre — alt på én linje (nowrap) */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, paddingLeft: 52 + SPACE.sm, fontSize: line2Size, whiteSpace: "nowrap" }}>
        <span><span style={{ color: MUTED }}>bud </span><Delta value={dBud} /></span>
        <span><span style={{ color: MUTED }}>fjor </span><Delta value={dFjor} /></span>
        <div style={{ marginLeft: "auto", display: "flex", gap: SPACE.md, color: MUTED }}>
          <span>Brutto <b style={{ color: "#fff", fontWeight: 800 }}>{pct(row.bruttoPct)}</b></span>
          <span>Lønn <b style={{ color: "#fff", fontWeight: 800 }}>{pct(row.lonnPct)}</b></span>
          <span>Svinn <b style={{ color: "#fff", fontWeight: 800 }}>{pct(row.svinnPct)}</b></span>
        </div>
      </div>
    </div>
  )
}

function PortraitOverview({ data }: { data: KpiOverviewData }) {
  const frame: React.CSSProperties = {
    margin: 0,
    width: "100%",
    height: "100vh",
    boxSizing: "border-box",
    padding: `${SPACE.lg}px ${SPACE.xl}px`,
    background: "linear-gradient(160deg,#0a0a0a,#141414)",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: SPACE.sm,
    overflow: "hidden",
  }
  return (
    <main style={frame}>
      {/* Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, flex: "0 0 auto" }}>
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>Gange-Rolv · alle butikker</div>
        <h1 style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 1 }}>{data.ytd ? `Hittil i år · ${data.year}` : `Uke ${data.latestWeek} · ${data.year}`}</h1>
      </header>

      {/* Total-hero */}
      <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.md, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.1)", borderBottom: "1px solid rgba(255,255,255,.1)", padding: `${SPACE.sm}px 0`, flex: "0 0 auto" }}>
        <div style={{ fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Total · {data.ytd ? "i år" : "uke"}</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{kr(data.heroOms)} <span style={{ fontSize: 30, color: MUTED }}>kr</span></div>
        <div style={{ fontSize: 30, marginLeft: "auto" }}>
          <span style={{ color: MUTED }}>bud </span><Delta value={diffPct(data.heroOms, data.heroBud)} />
          <span style={{ color: MUTED }}> · fjor </span><Delta value={diffPct(data.heroOms, data.heroFjor)} />
        </div>
      </div>

      {/* Butikk-kort — deler høyden likt (flex:1) så ALLE butikker får plass uten
          klipp, uansett antall (kiosk kan ikke scrolle). */}
      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: data.rows.length > 12 ? 4 : SPACE.xs }}>
        {data.rows.map((row, i) => (
          <PortraitRow key={row.storeName} row={row} rank={i + 1} dense={data.rows.length > 12} />
        ))}
      </section>
    </main>
  )
}

export function KpiOverviewScreen({ data }: { data: KpiOverviewData }) {
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

  if (isLandscape === null) {
    return <main style={{ position: "fixed", inset: 0, background: "#0a0a0a" }} />
  }

  return (
    <>
      <AutoReload />
      {isLandscape ? <LandscapeOverview data={data} /> : <PortraitOverview data={data} />}
    </>
  )
}
