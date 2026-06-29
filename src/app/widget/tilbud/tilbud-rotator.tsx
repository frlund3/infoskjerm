"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { LiveItem, Block } from "@/lib/content/live"

/**
 * Full-screen offer presentation: a left side panel with the heading, period and
 * text, and the offer poster/PDF filling the rest. A bottom ticker overlay shows
 * only when there are active ticker messages. Rotates through active offers.
 */

const SECONDS = 18
const TICKER_HEIGHT = 96
const GREEN = "#16a34a"

const frame: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  background: "linear-gradient(135deg,#0a0a0a,#161616)",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#fff",
}

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

function RichBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} style={{ fontSize: 30, fontWeight: 800, margin: "18px 0 4px" }}>{b.text}</p>
        if (b.kind === "li")
          return (
            <div key={i} style={{ display: "flex", gap: 12, fontSize: 27, lineHeight: 1.4, color: "rgba(255,255,255,.9)", margin: "5px 0" }}>
              <span style={{ color: GREEN }}>•</span>
              <span>{b.text}</span>
            </div>
          )
        return <p key={i} style={{ fontSize: 27, lineHeight: 1.45, color: "rgba(255,255,255,.9)", margin: "9px 0" }}>{b.text}</p>
      })}
    </div>
  )
}

/** Auto-scrolls the side-panel text when it overflows. */
function ScrollText({ blocks }: { blocks: Block[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const w = wrap.current
    const n = inner.current
    if (!w || !n) return
    const over = n.scrollHeight - w.clientHeight
    if (over <= 8) return
    const dur = Math.max(10, Math.round(over / 35) + 6) * 1000
    const anim = n.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(0)", offset: 0.12 },
        { transform: `translateY(-${over}px)`, offset: 0.88 },
        { transform: `translateY(-${over}px)` },
      ],
      { duration: dur, iterations: Infinity, direction: "alternate", easing: "ease-in-out" }
    )
    return () => anim.cancel()
  }, [blocks])
  return (
    <div ref={wrap} style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", position: "relative" }}>
      <div ref={inner}>
        <RichBlocks blocks={blocks} />
      </div>
    </div>
  )
}

/** Poster (contain), PDF first page (iframe), or several images side by side. */
function Media({ item }: { item: LiveItem }) {
  if (item.isPdf && item.imageUrl) {
    return (
      <iframe
        title={item.title}
        src={`${item.imageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
        style={{ flex: "1 1 auto", minHeight: 0, width: "100%", border: "none", borderRadius: 18, background: "#fff" }}
      />
    )
  }
  const urls = item.imageUrls.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : []
  if (urls.length === 0) return <div style={{ flex: "1 1 auto" }} />
  const cols = urls.length >= 4 ? 2 : urls.length
  const rows = Math.ceil(urls.length / cols)
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 18 }}>
      {urls.map((url, i) => (
        <div key={i} style={{ minHeight: 0, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,.04)", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ))}
    </div>
  )
}

function SidePanel({ item, storeName }: { item: LiveItem; storeName: string | null }) {
  const period = formatPeriod(item.validFrom, item.validTo)
  return (
    <aside style={{ flex: "0 0 34%", maxWidth: 640, display: "flex", flexDirection: "column", padding: "60px 54px", boxSizing: "border-box", background: "rgba(255,255,255,.04)", borderRight: "1px solid rgba(255,255,255,.08)" }}>
      <p style={{ color: GREEN, fontWeight: "bold", letterSpacing: 4, fontSize: 24, margin: 0, textTransform: "uppercase" }}>Tilbud</p>
      {storeName && <p style={{ fontSize: 22, color: "rgba(255,255,255,.5)", margin: "10px 0 0", textTransform: "uppercase", letterSpacing: 1 }}>{storeName}</p>}
      <h1 style={{ fontSize: 60, fontWeight: 900, margin: "16px 0 18px", lineHeight: 1.04 }}>{item.title}</h1>
      {period && (
        <span style={{ alignSelf: "flex-start", background: GREEN, color: "#fff", fontSize: 25, fontWeight: 700, padding: "10px 24px", borderRadius: 9999, marginBottom: 26 }}>
          {period}
        </span>
      )}
      <ScrollText blocks={item.blocks} />
    </aside>
  )
}

function TickerOverlay({ messages }: { messages: string[] }) {
  const line = messages.join("    ·    ")
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TICKER_HEIGHT, display: "flex", alignItems: "center", overflow: "hidden", background: GREEN, color: "#fff" }}>
      <style>{`@keyframes gr-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.65)}70%{box-shadow:0 0 0 16px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}@keyframes gr-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 28px", height: "100%", flex: "0 0 auto", background: GREEN, zIndex: 2, fontWeight: 900, fontSize: 26, letterSpacing: 3 }}>
        <span style={{ width: 15, height: 15, borderRadius: 9999, background: "#ef4444", flex: "0 0 auto", animation: "gr-pulse 1.4s ease-out infinite" }} />
        <span>NYTT</span>
      </div>
      <div style={{ flex: "1 1 auto", overflow: "hidden", position: "relative", height: "100%" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: 30, fontWeight: 600, animation: "gr-scroll 30s linear infinite", willChange: "transform" }}>
          <span style={{ paddingRight: 80 }}>{line}</span>
          <span style={{ paddingRight: 80 }}>{line}</span>
        </div>
      </div>
    </div>
  )
}

export function TilbudRotator({ items, ticker, storeName }: { items: LiveItem[]; ticker: string[]; storeName: string | null }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length <= 1) return
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), SECONDS * 1000)
    return () => clearTimeout(id)
  }, [i, items])

  // Refresh periodically so newly published offers (and expiry) take effect.
  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 10 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const item = items.length ? items[i % items.length] : null
  const hasTicker = ticker.length > 0
  const inset: CSSProperties = hasTicker ? { position: "absolute", top: 0, left: 0, right: 0, bottom: TICKER_HEIGHT } : { position: "absolute", inset: 0 }

  return (
    <main style={frame}>
      <style>{"@keyframes grFade{from{opacity:0}to{opacity:1}}"}</style>
      {!item ? (
        <div style={{ ...inset, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive tilbud
        </div>
      ) : (
        <div key={item.id} style={{ ...inset, display: "flex", animation: "grFade .6s ease-out" }}>
          <SidePanel item={item} storeName={storeName} />
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", padding: 48, boxSizing: "border-box" }}>
            <Media item={item} />
          </div>
        </div>
      )}
      {hasTicker && <TickerOverlay messages={ticker} />}
    </main>
  )
}
