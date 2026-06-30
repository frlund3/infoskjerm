"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { LiveItem, Block } from "@/lib/content/live"
import { OfferCard } from "@/app/widget/tilbud/offer-card"
import { PdfFlyer } from "@/app/widget/tilbud/pdf-flyer"
import { CompetitionCard } from "@/app/widget/_shared/competition-card"
import { InvitationCard } from "@/app/widget/_shared/invitation-card"
import { GalleryCard } from "@/app/widget/_shared/gallery-card"

const KICKER: Record<string, string> = {
  competition: "KONKURRANSE",
  slide: "TILBUD",
  job: "STILLING LEDIG",
  birthday: "GRATULERER",
  stats: "SALGSTALL",
  invitation: "INVITASJON",
}

// Seconds per card by type (longer for ones you read/scan).
const SECONDS: Record<string, number> = { stats: 12, job: 20, competition: 16, invitation: 18, gallery: 30 }
const DEFAULT_SECONDS = 16

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

/** Renders parsed text blocks as React (no raw HTML injection). */
function RichBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h")
          return (
            <p key={i} style={{ fontSize: 38, fontWeight: 800, margin: "20px 0 6px", color: "currentColor" }}>
              {b.text}
            </p>
          )
        if (b.kind === "li")
          return (
            <div key={i} style={{ display: "flex", gap: 14, fontSize: 34, lineHeight: 1.4, color: "currentColor", margin: "6px 0", opacity: 0.92 }}>
              <span style={{ color: "#16a34a" }}>•</span>
              <span>{b.text}</span>
            </div>
          )
        return (
          <p key={i} style={{ fontSize: 34, lineHeight: 1.45, color: "currentColor", margin: "10px 0", opacity: 0.92 }}>
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

/** Auto-scrolls its content (down then back) when it overflows the box. */
function ScrollText({ blocks, style }: { blocks: Block[]; style?: CSSProperties }) {
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
    <div ref={wrap} style={{ ...style, overflow: "hidden", position: "relative" }}>
      <div ref={inner}>
        <RichBlocks blocks={blocks} />
      </div>
    </div>
  )
}

function Kicker({ children }: { children: string }) {
  return (
    <p style={{ color: "#16a34a", fontWeight: "bold", letterSpacing: 4, fontSize: 26, margin: "0 0 16px", textTransform: "uppercase" }}>
      {children}
    </p>
  )
}

function Byline({ item }: { item: LiveItem }) {
  const parts = [item.date, item.author].filter(Boolean)
  if (parts.length === 0) return null
  return <p style={{ fontSize: 24, color: "currentColor", opacity: 0.55, margin: "0 0 24px" }}>{parts.join(" · ")}</p>
}

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

function PeriodChip({ item }: { item: LiveItem }) {
  // Only offers have a customer-relevant validity period. On regular posts the
  // date is just an internal publish/scheduling detail — don't show it.
  if (item.type !== "slide") return null
  const label = formatPeriod(item.validFrom, item.validTo)
  if (!label) return null
  return (
    <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#16a34a", color: "#fff", fontSize: 26, fontWeight: 700, padding: "10px 24px", borderRadius: 9999, marginBottom: 20 }}>
      {label}
    </span>
  )
}

/** Full-bleed media for poster mode — image (contain) or PDF page (iframe). */
function MediaFull({ item }: { item: LiveItem }) {
  if (!item.imageUrl) return null
  if (item.isVideo) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={item.imageUrl} autoPlay muted loop playsInline style={{ flex: "1 1 auto", minHeight: 0, width: "100%", objectFit: "contain", borderRadius: 14, background: item.bgColor ?? "transparent" }} />
    )
  }
  if (item.isPdf) {
    return (
      <iframe
        title={item.title}
        src={`${item.imageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
        style={{ flex: "1 1 auto", minHeight: 0, width: "100%", border: "none", borderRadius: 14, background: "#fff" }}
      />
    )
  }
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, backgroundImage: `url('${item.imageUrl}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", borderRadius: 16 }} />
  )
}

function bgImage(url: string): CSSProperties {
  return { position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.22, animation: "grKenBurns 26s ease-in-out infinite alternate", transformOrigin: "center" }
}

function StandardCard({ item }: { item: LiveItem }) {
  // Base colour comes from the rotator wrapper; the background media (image or
  // video) overlays it dimmed, so a chosen colour always shows through.
  return (
    <>
      {item.imageUrl && item.isVideo && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={item.imageUrl} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22 }} />
      )}
      {item.imageUrl && !item.isVideo && <div style={bgImage(item.imageUrl)} />}
      <div style={{ position: "absolute", inset: 0, padding: 70, boxSizing: "border-box", display: "flex", flexDirection: "column", color: item.textColor ?? "#fff" }}>
        {KICKER[item.type] && <Kicker>{KICKER[item.type]}</Kicker>}
        <h1 style={{ fontSize: 78, fontWeight: 900, margin: "0 0 14px", lineHeight: 1.03 }}>{item.title}</h1>
        <Byline item={item} />
        <PeriodChip item={item} />
        <ScrollText blocks={item.blocks} style={{ flex: "1 1 auto" }} />
      </div>
    </>
  )
}

/** Several images shown full-page, side by side (no dimmed background). */
function Gallery({ urls }: { urls: string[] }) {
  const cols = urls.length >= 4 ? 2 : urls.length // 2/3 in a row; 4 → 2×2
  const rows = Math.ceil(urls.length / cols)
  return (
    <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 18 }}>
      {urls.map((url, i) => (
        <div key={i} style={{ minHeight: 0, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,.04)", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ))}
    </div>
  )
}

/**
 * Text on the left, image(s) on the right. Used for multi-image posts and for
 * single-image "Lite bilde" mode — so the text stays readable next to the image
 * instead of disappearing (poster) or sitting on a dimmed background.
 */
function SplitCard({ item }: { item: LiveItem }) {
  const multi = item.imageUrls.length >= 2
  return (
    <div style={{ position: "absolute", inset: 0, padding: 60, boxSizing: "border-box", display: "flex", gap: 44, alignItems: "stretch" }}>
      <div style={{ flex: multi ? "0 0 40%" : "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
        {KICKER[item.type] && <Kicker>{KICKER[item.type]}</Kicker>}
        <h1 style={{ fontSize: 60, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.04 }}>{item.title}</h1>
        <Byline item={item} />
        <PeriodChip item={item} />
        <ScrollText blocks={item.blocks} style={{ flex: "1 1 auto" }} />
      </div>
      <div style={{ flex: multi ? "1 1 auto" : "0 0 38%", minWidth: 0, display: "flex" }}>
        <Gallery urls={item.imageUrls} />
      </div>
    </div>
  )
}

function PosterCard({ item }: { item: LiveItem }) {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 50, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" }}>
        {KICKER[item.type] && <Kicker>{KICKER[item.type]}</Kicker>}
        <h1 style={{ fontSize: 58, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.04 }}>{item.title}</h1>
        <PeriodChip item={item} />
      </div>
      <MediaFull item={item} />
    </div>
  )
}

function QrPanel({ qrUrl, contact }: { qrUrl?: string; contact: string | null }) {
  return (
    <div style={{ flex: "0 0 36%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 40, background: "rgba(255,255,255,.06)", borderLeft: "1px solid rgba(255,255,255,.08)" }}>
      {qrUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR-kode for å søke" width={300} height={300} style={{ background: "#fff", padding: 18, borderRadius: 18 }} />
          <p style={{ fontSize: 30, fontWeight: 700, margin: 0, textAlign: "center" }}>Skann for å søke</p>
        </>
      )}
      {contact && (
        <p style={{ fontSize: 26, color: "rgba(255,255,255,.7)", margin: 0, textAlign: "center" }}>
          Kontakt: <span style={{ color: "#fff", fontWeight: 600 }}>{contact}</span>
        </p>
      )}
    </div>
  )
}

function JobCard({ item, qrUrl }: { item: LiveItem; qrUrl?: string }) {
  const showQrPanel = !!qrUrl || !!item.contactPerson
  const poster = item.imageMode === "plakat" && item.imageUrl
  return (
    <>
      {!poster && item.imageUrl && <div style={bgImage(item.imageUrl)} />}
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, padding: 60, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <Kicker>STILLING LEDIG</Kicker>
          <h1 style={{ fontSize: 60, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.04 }}>{item.title}</h1>
          <Byline item={item} />
          {poster ? (
            <div style={{ flex: "1 1 auto", minHeight: 0, backgroundImage: `url('${item.imageUrl}')`, backgroundSize: "contain", backgroundPosition: "left center", backgroundRepeat: "no-repeat", borderRadius: 14 }} />
          ) : (
            <ScrollText blocks={item.blocks} style={{ flex: "1 1 auto" }} />
          )}
        </div>
        {showQrPanel && <QrPanel qrUrl={qrUrl} contact={item.contactPerson} />}
      </div>
    </>
  )
}

function StatsCard({ item }: { item: LiveItem }) {
  const change = item.statsChange?.trim() ?? ""
  const up = /(^[+▲])|opp|øk/i.test(change)
  const down = /(^[-▼])|ned|fall/i.test(change)
  const changeColor = up ? "#16a34a" : down ? "#ef4444" : "rgba(255,255,255,.6)"
  const changeText = change.replace(/^[▲▼+\-]\s*/, "").trim()
  return (
    <div style={{ position: "absolute", inset: 0, padding: 80, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 8 }}>
      <Kicker>SALGSTALL</Kicker>
      <h1 style={{ fontSize: 56, fontWeight: 800, margin: "0 0 20px", color: "rgba(255,255,255,.8)", lineHeight: 1.05 }}>{item.title}</h1>
      {item.statsValue && <div style={{ fontSize: 170, fontWeight: 900, lineHeight: 0.95, letterSpacing: -4 }}>{item.statsValue}</div>}
      {change && (
        <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 12, fontSize: 44, fontWeight: 800, color: changeColor }}>
          {up ? "▲" : down ? "▼" : ""} {changeText || change}
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <Byline item={item} />
      </div>
    </div>
  )
}

/** Staff "ukens tilbud" slide on the internal screen: structured offer card,
 *  rasterised PDF flyer, or an uploaded poster — never on customer screens. */
function SlideCard({ item }: { item: LiveItem }) {
  if (item.offer) {
    // OfferCard is portrait — centre it in a 9:16 box on the landscape screen.
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", background: "#0a0a0a" }}>
        <div style={{ position: "relative", height: "100%", aspectRatio: "9 / 16" }}>
          <OfferCard item={item} />
        </div>
      </div>
    )
  }
  if (item.isPdf && item.imageUrl) return <PdfFlyer url={item.imageUrl} title={item.title} pages={item.pages} />
  return <PosterCard item={item} />
}

function Card({ item, qrUrl }: { item: LiveItem; qrUrl?: string }) {
  if (item.type === "competition") return <CompetitionCard item={item} qrUrl={qrUrl} />
  if (item.type === "invitation") return <InvitationCard item={item} qrUrl={qrUrl} />
  if (item.type === "gallery") return <GalleryCard item={item} qrUrl={qrUrl} />
  if (item.type === "slide") return <SlideCard item={item} />
  if (item.type === "stats") return <StatsCard item={item} />
  if (item.type === "job") return <JobCard item={item} qrUrl={qrUrl} />
  // 2+ images, or single image in "Lite bilde" mode → text left, image(s) right.
  if (item.imageUrls.length >= 2) return <SplitCard item={item} />
  if (item.imageUrl && item.imageMode === "liten" && !item.isPdf) return <SplitCard item={item} />
  // Posters & PDFs always show full (never as a cropped background).
  if (item.imageUrl && (item.imageMode === "plakat" || item.isPdf)) return <PosterCard item={item} />
  return <StandardCard item={item} />
}

const TICKER_HEIGHT = 96

/**
 * Bottom ticker bar — a continuous, reliable CSS marquee. Each message is a
 * distinct segment (bullet + text + gap) so they read as separate tickers
 * flowing one after another ("flere tickere etter hverandre"). The line is
 * duplicated and translated -50% for a seamless loop; speed scales with the
 * total length so a long set isn't a blur.
 */
function TickerOverlay({ messages }: { messages: string[] }) {
  const totalChars = messages.reduce((n, m) => n + m.length + 6, 0)
  const dur = Math.max(24, Math.round(totalChars / 4)) // seconds for one full loop

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
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TICKER_HEIGHT, display: "flex", alignItems: "center", overflow: "hidden", background: "#16a34a", color: "#fff" }}>
      <style>{`@keyframes gr-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.65)}70%{box-shadow:0 0 0 16px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}@keyframes gr-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 28px", height: "100%", flex: "0 0 auto", background: "#16a34a", zIndex: 2, fontWeight: 900, fontSize: 26, letterSpacing: 3 }}>
        <span style={{ width: 15, height: 15, borderRadius: 9999, background: "#ef4444", flex: "0 0 auto", animation: "gr-pulse 1.4s ease-out infinite" }} />
        <span>NYTT</span>
      </div>
      <div style={{ flex: "1 1 auto", overflow: "hidden", position: "relative", height: "100%" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", display: "flex", alignItems: "center", animation: `gr-scroll ${dur}s linear infinite`, willChange: "transform" }}>
          <Segment k="a" />
          <Segment k="b" />
        </div>
      </div>
    </div>
  )
}

export function NewsRotator({ items, qr, ticker }: { items: LiveItem[]; qr: Record<string, string>; ticker: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length <= 1) return
    const it = items[i % items.length]
    const secs = it?.durationSeconds ?? SECONDS[it?.type ?? ""] ?? DEFAULT_SECONDS
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), secs * 1000)
    return () => clearTimeout(id)
  }, [i, items])

  // Refresh the page periodically so newly published content appears on screen.
  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 10 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const item = items.length ? items[i % items.length] : null
  const hasTicker = ticker.length > 0
  // Reserve space at the bottom for the ticker only when it is showing.
  const contentInset: CSSProperties = hasTicker ? { position: "absolute", top: 0, left: 0, right: 0, bottom: TICKER_HEIGHT } : { position: "absolute", inset: 0 }

  return (
    <main style={frame}>
      <style>{"@keyframes grFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes grKenBurns{from{transform:scale(1)}to{transform:scale(1.1)}}"}</style>
      {!item ? (
        <div style={{ ...contentInset, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen publiserte nyheter
        </div>
      ) : (
        <div key={item.id} style={{ ...contentInset, overflow: "hidden", animation: "grFade .6s ease-out", background: item.bgColor ?? undefined, color: item.textColor ?? undefined }}>
          <Card item={item} qrUrl={qr[item.id]} />
        </div>
      )}
      {hasTicker && <TickerOverlay messages={ticker} />}
    </main>
  )
}
