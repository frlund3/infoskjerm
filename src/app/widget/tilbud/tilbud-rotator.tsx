"use client"

import { useEffect, useState, type CSSProperties } from "react"
import type { LiveItem, Block } from "@/lib/content/live"
import { OfferCard, type ChainBrand } from "./offer-card"
import { PdfFlyer } from "./pdf-flyer"
import { CompetitionCard } from "@/app/widget/_shared/competition-card"

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
  // Single poster (often portrait): contain it, and fill the empty sides with a
  // blurred, enlarged copy so a portrait ad never leaves black bars on screen.
  if (urls.length === 1) {
    const url = urls[0]
    return (
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(48px) brightness(0.45)", transform: "scale(1.25)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    )
  }
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

/** Header block for a customer poster slide: kicker, title, text and period —
 *  stacked ABOVE the image/PDF (portrait: text on top, media below). */
function PosterHeader({ item, storeName }: { item: LiveItem; storeName: string | null }) {
  const period = formatPeriod(item.validFrom, item.validTo)
  return (
    <div style={{ flex: "0 0 auto", padding: "64px 60px 24px", display: "flex", flexDirection: "column" }}>
      <p style={{ color: GREEN, fontWeight: "bold", letterSpacing: 4, fontSize: 26, margin: 0, textTransform: "uppercase" }}>Tilbud</p>
      {storeName && <p style={{ fontSize: 22, color: "rgba(255,255,255,.5)", margin: "10px 0 0", textTransform: "uppercase", letterSpacing: 1 }}>{storeName}</p>}
      <h1 style={{ fontSize: 78, fontWeight: 900, margin: "16px 0 0", lineHeight: 1.03 }}>{item.title}</h1>
      {item.blocks.length > 0 && (
        <div style={{ maxHeight: 300, overflow: "hidden", marginTop: 18 }}>
          <RichBlocks blocks={item.blocks} />
        </div>
      )}
      {period && (
        <span style={{ alignSelf: "flex-start", background: GREEN, color: "#fff", fontSize: 28, fontWeight: 700, padding: "10px 28px", borderRadius: 9999, marginTop: 22 }}>
          {period}
        </span>
      )}
    </div>
  )
}

/** Continuous, reliable CSS marquee — each message a distinct segment, looping
 *  seamlessly. Speed scales with total length. Same behaviour as the internal
 *  screen ticker (only shown on customer screens when opted in). */
function TickerOverlay({ messages }: { messages: string[] }) {
  const totalChars = messages.reduce((n, m) => n + m.length + 6, 0)
  const dur = Math.max(24, Math.round(totalChars / 4))
  const Segment = ({ k }: { k: string }) => (
    <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }} aria-hidden={k === "b"}>
      {messages.map((m, p) => (
        <span key={`${k}-${p}`} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", paddingRight: 72 }}>
          <span style={{ width: 12, height: 12, borderRadius: 9999, background: "rgba(255,255,255,.55)", marginRight: 26, flex: "0 0 auto" }} />
          <span style={{ fontSize: 30, fontWeight: 600 }}>{m}</span>
        </span>
      ))}
    </div>
  )
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TICKER_HEIGHT, display: "flex", alignItems: "center", overflow: "hidden", background: GREEN, color: "#fff" }}>
      <style>{`@keyframes gr-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.65)}70%{box-shadow:0 0 0 16px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}@keyframes gr-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 28px", height: "100%", flex: "0 0 auto", background: GREEN, zIndex: 2, fontWeight: 900, fontSize: 26, letterSpacing: 3 }}>
        <span style={{ width: 15, height: 15, borderRadius: 9999, background: "#ef4444", flex: "0 0 auto", animation: "gr-pulse 1.4s ease-out infinite" }} />
        <span>NYTT</span>
      </div>
      <div style={{ flex: "1 1 auto", overflow: "hidden", position: "relative", height: "100%" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", display: "flex", alignItems: "center", animation: `gr-scroll ${dur}s linear infinite`, willChange: "transform" }}>
          <Segment k="a" />
          <Segment k="b" />
        </div>
      </div>
    </div>
  )
}

export function TilbudRotator({ items, ticker, storeName, chain = null, qr = {} }: { items: LiveItem[]; ticker: string[]; storeName: string | null; chain?: ChainBrand | null; qr?: Record<string, string> }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length <= 1) return
    // PDF flyers (kundeavis) get longer so several pages show before advancing.
    const secs = items[i % items.length]?.isPdf ? 45 : SECONDS
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), secs * 1000)
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
      ) : item.type === "competition" ? (
        // Customer competition → full-bleed flashy portrait card with QR.
        <div key={item.id} style={{ ...inset, animation: "grFade .6s ease-out" }}>
          <CompetitionCard item={item} qrUrl={qr[item.id]} portrait />
        </div>
      ) : item.offer ? (
        // Structured offer → full-bleed price card (no side panel).
        <div key={item.id} style={{ ...inset, animation: "grFade .6s ease-out" }}>
          <OfferCard item={item} chain={chain} />
        </div>
      ) : item.isPdf && item.imageUrl ? (
        // Kundeavis / PDF → rasterised page-by-page (pdf.js), full-bleed, under a
        // bold heading. No native PDF viewer chrome (toolbar/scrollbars).
        <div key={item.id} style={{ ...inset, animation: "grFade .6s ease-out" }}>
          <PdfFlyer url={item.imageUrl} title={item.title} color={chain?.color} fg={chain?.brandFg} pages={item.pages} />
        </div>
      ) : (
        // Customer poster/PDF slide → text on TOP, image/PDF below (portrait).
        <div key={item.id} style={{ ...inset, display: "flex", flexDirection: "column", animation: "grFade .6s ease-out" }}>
          <PosterHeader item={item} storeName={storeName} />
          <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", padding: "0 54px 54px", boxSizing: "border-box" }}>
            <Media item={item} />
          </div>
        </div>
      )}
      {hasTicker && <TickerOverlay messages={ticker} />}
    </main>
  )
}
