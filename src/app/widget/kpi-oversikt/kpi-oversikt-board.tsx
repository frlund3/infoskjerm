"use client"

import type { CSSProperties } from "react"
import { kr, pct, diffPct } from "@/lib/content/kpi-format"
import { AutoReload } from "@/app/widget/_shared/auto-reload"
import { useOrientation } from "@/app/widget/_shared/use-orientation"

/**
 * Klient-presentasjon for KPI-oversikten (alle butikker). Server-siden
 * (page.tsx) henter og forbereder serialiserbare rader + hero-totaler; her velges
 * layout ut fra iframe-orienteringen:
 *
 *   Liggende (16:9) → tett tabell med alle kolonner (som før), nå i cq-enheter.
 *   Stående  (9:16) → vertikal stabling: hero øverst, deretter butikk-kort med
 *                     2-linjers KPI-oppsett. Aldri en horisontal tabell som klipper.
 *
 * Alle mål er container-query-enheter (containerType: "size" på ytre boks), så
 * begge retninger er skarpe og oppløsnings-uavhengige på enhver skjerm.
 */

const GREEN = "#16a34a"
const RED = "#ef4444"
const MUTED = "rgba(255,255,255,.5)"
const FAINT = "rgba(255,255,255,.035)"

/** Én butikks tall, ferdig oppløst for valgt periode (uke eller hittil i år). */
export interface RowView {
  storeName: string
  omsetning: number | null
  budsjett: number | null
  fjor: number | null
  bruttoPct: number | null
  lonnPct: number | null
  svinnPct: number | null
}

export interface KpiBoardData {
  rows: RowView[]
  heroOms: number
  heroBud: number
  heroFjor: number
  headline: string
  periodLabel: string
}

const frameBase: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  boxSizing: "border-box",
  background: "linear-gradient(135deg,#0a0a0a,#141414)",
  color: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif",
  overflow: "hidden",
  containerType: "size",
}

function medalFor(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null
}

// ---------- shared delta ----------

function Delta({ value, digits = 1, size }: { value: number | null; digits?: number; size: string }) {
  if (value === null) return <span style={{ color: MUTED, fontSize: size }}>–</span>
  const up = value >= 0
  return (
    <span style={{ color: up ? GREEN : RED, fontWeight: 800, fontSize: size, whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %
    </span>
  )
}

// ================= LANDSCAPE (tabell) =================

function HeadCellL({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <div style={{ width, flex: width ? "0 0 auto" : "1 1 auto", textAlign: "right", fontSize: "1.7cqh", letterSpacing: "0.1cqh", textTransform: "uppercase", color: MUTED }}>
      {children}
    </div>
  )
}

function LandscapeRow({ row, rank }: { row: RowView; rank: number }) {
  const dBud = diffPct(row.omsetning, row.budsjett)
  const dFjor = diffPct(row.omsetning, row.fjor)
  const medal = medalFor(rank)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5cqw", padding: "0 2cqw", flex: "1 1 0", minHeight: 0, borderRadius: "1.3cqh", background: rank % 2 ? "transparent" : FAINT }}>
      <div style={{ width: "3.6cqw", flex: "0 0 auto", fontSize: "2.6cqh", fontWeight: 800, color: MUTED, textAlign: "center" }}>{medal ?? rank}</div>
      <div style={{ flex: "1 1 auto", minWidth: 0, fontSize: "2.7cqh", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.storeName}</div>
      <div style={{ width: "16cqw", flex: "0 0 auto", textAlign: "right", fontSize: "2.9cqh", fontWeight: 900 }}>
        {kr(row.omsetning)} <span style={{ fontSize: "1.7cqh", color: MUTED }}>kr</span>
      </div>
      <div style={{ width: "11cqw", flex: "0 0 auto", textAlign: "right" }}><Delta value={dBud} size="2.4cqh" /></div>
      <div style={{ width: "11cqw", flex: "0 0 auto", textAlign: "right" }}><Delta value={dFjor} size="2.4cqh" /></div>
      <div style={{ width: "9cqw", flex: "0 0 auto", textAlign: "right", fontSize: "2.4cqh", fontWeight: 700 }}>{pct(row.bruttoPct)}</div>
      <div style={{ width: "9cqw", flex: "0 0 auto", textAlign: "right", fontSize: "2.4cqh", fontWeight: 700 }}>{pct(row.lonnPct)}</div>
      <div style={{ width: "9cqw", flex: "0 0 auto", textAlign: "right", fontSize: "2.4cqh", fontWeight: 700 }}>{pct(row.svinnPct)}</div>
    </div>
  )
}

function LandscapeBoard({ data }: { data: KpiBoardData }) {
  return (
    <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: "5cqh 3cqw", display: "flex", flexDirection: "column", gap: "2.4cqh", overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "flex-end", gap: "2cqw" }}>
        <div>
          <div style={{ fontSize: "2cqh", letterSpacing: "0.3cqh", textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>Gange-Rolv · alle butikker</div>
          <h1 style={{ fontSize: "4.6cqh", fontWeight: 900, margin: "0.4cqh 0 0" }}>{data.headline}</h1>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "1.9cqh", letterSpacing: "0.15cqh", textTransform: "uppercase", color: MUTED }}>Total omsetning · {data.periodLabel}</div>
          <div style={{ fontSize: "5.2cqh", fontWeight: 900, lineHeight: 1 }}>{kr(data.heroOms)} <span style={{ fontSize: "2.6cqh", color: MUTED }}>kr</span></div>
          <div style={{ fontSize: "2.3cqh", marginTop: "0.4cqh" }}>
            <span style={{ color: MUTED }}>vs budsjett </span><Delta value={diffPct(data.heroOms, data.heroBud)} size="2.3cqh" />
            <span style={{ color: MUTED }}>  ·  vs i fjor </span><Delta value={diffPct(data.heroOms, data.heroFjor)} size="2.3cqh" />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5cqw", padding: "0 2cqw" }}>
        <div style={{ width: "3.6cqw", flex: "0 0 auto" }} />
        <div style={{ flex: "1 1 auto", fontSize: "1.7cqh", letterSpacing: "0.1cqh", textTransform: "uppercase", color: MUTED }}>Butikk</div>
        <HeadCellL width="16cqw">Omsetning</HeadCellL>
        <HeadCellL width="11cqw">vs bud.</HeadCellL>
        <HeadCellL width="11cqw">vs fjor</HeadCellL>
        <HeadCellL width="9cqw">Brutto</HeadCellL>
        <HeadCellL width="9cqw">Lønn</HeadCellL>
        <HeadCellL width="9cqw">Svinn</HeadCellL>
      </div>

      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "0.4cqh" }}>
        {data.rows.map((row, i) => (
          <LandscapeRow key={row.storeName} row={row} rank={i + 1} />
        ))}
      </section>
    </div>
  )
}

// ================= PORTRAIT (stablet) =================

/** Kompakt nøkkeltall-boks brukt i butikk-kortenes andre rad. */
function Metric({ label, children, align = "left" }: { label: string; children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3cqh", minWidth: 0, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <span style={{ fontSize: "1.4cqh", letterSpacing: "0.1cqh", textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: "2.2cqh", fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
    </div>
  )
}

function PortraitCard({ row, rank }: { row: RowView; rank: number }) {
  const dBud = diffPct(row.omsetning, row.budsjett)
  const dFjor = diffPct(row.omsetning, row.fjor)
  const medal = medalFor(rank)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2cqh", flex: "1 1 0", minHeight: 0, justifyContent: "center", padding: "1.4cqh 3cqw", borderRadius: "1.6cqh", background: rank % 2 ? "transparent" : FAINT }}>
      {/* Rad 1: rang · butikk · omsetning */}
      <div style={{ display: "flex", alignItems: "center", gap: "2.5cqw" }}>
        <div style={{ width: "8cqw", flex: "0 0 auto", fontSize: "3.4cqh", fontWeight: 800, color: MUTED, textAlign: "center" }}>{medal ?? rank}</div>
        <div style={{ flex: "1 1 auto", minWidth: 0, fontSize: "3.4cqh", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.storeName}</div>
        <div style={{ flex: "0 0 auto", textAlign: "right" }}>
          <div style={{ fontSize: "3.6cqh", fontWeight: 900, lineHeight: 1 }}>{kr(row.omsetning)} <span style={{ fontSize: "1.9cqh", color: MUTED }}>kr</span></div>
        </div>
      </div>
      {/* Rad 2: nøkkeltall */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "2.5cqw", paddingLeft: "10.5cqw" }}>
        <Metric label="vs bud."><Delta value={dBud} size="2.2cqh" /></Metric>
        <Metric label="vs fjor"><Delta value={dFjor} size="2.2cqh" /></Metric>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4cqw" }}>
          <Metric label="Brutto" align="right">{pct(row.bruttoPct)}</Metric>
          <Metric label="Lønn" align="right">{pct(row.lonnPct)}</Metric>
          <Metric label="Svinn" align="right">{pct(row.svinnPct)}</Metric>
        </div>
      </div>
    </div>
  )
}

function PortraitBoard({ data }: { data: KpiBoardData }) {
  return (
    <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", padding: "4cqh 4cqw", display: "flex", flexDirection: "column", gap: "2.4cqh", overflow: "hidden" }}>
      {/* Hero — stablet øverst */}
      <header style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "1cqh", padding: "3cqh 4cqw", borderRadius: "2cqh", background: `linear-gradient(135deg, ${GREEN}22 0%, ${FAINT} 90%)` }}>
        <div style={{ fontSize: "2cqh", letterSpacing: "0.3cqh", textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>Gange-Rolv · alle butikker</div>
        <h1 style={{ fontSize: "4.4cqh", fontWeight: 900, margin: 0, lineHeight: 1.05 }}>{data.headline}</h1>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3cqw", flexWrap: "wrap", marginTop: "0.6cqh" }}>
          <div>
            <div style={{ fontSize: "1.7cqh", letterSpacing: "0.15cqh", textTransform: "uppercase", color: MUTED }}>Total omsetning · {data.periodLabel}</div>
            <div style={{ fontSize: "6cqh", fontWeight: 900, lineHeight: 1 }}>{kr(data.heroOms)} <span style={{ fontSize: "2.8cqh", color: MUTED }}>kr</span></div>
          </div>
          <div style={{ display: "flex", gap: "5cqw", marginBottom: "0.6cqh" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3cqh" }}>
              <span style={{ fontSize: "1.6cqh", textTransform: "uppercase", color: MUTED }}>vs budsjett</span>
              <Delta value={diffPct(data.heroOms, data.heroBud)} size="2.6cqh" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3cqh" }}>
              <span style={{ fontSize: "1.6cqh", textTransform: "uppercase", color: MUTED }}>vs i fjor</span>
              <Delta value={diffPct(data.heroOms, data.heroFjor)} size="2.6cqh" />
            </div>
          </div>
        </div>
      </header>

      {/* Butikk-kort — stablet under, fyller resten */}
      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "0.6cqh" }}>
        {data.rows.map((row, i) => (
          <PortraitCard key={row.storeName} row={row} rank={i + 1} />
        ))}
      </section>
    </div>
  )
}

// ================= root =================

export function KpiOversiktBoard({ data }: { data: KpiBoardData }) {
  const orientation = useOrientation()
  return (
    <main style={{ ...frameBase, position: "relative" }}>
      <AutoReload />
      {orientation === "portrait" ? <PortraitBoard data={data} /> : <LandscapeBoard data={data} />}
    </main>
  )
}

export function KpiOversiktEmpty() {
  return (
    <main style={{ ...frameBase, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: MUTED, fontSize: "4cqh", textAlign: "center", padding: "0 6cqw" }}>Ingen driftstall tilgjengelig</div>
    </main>
  )
}
