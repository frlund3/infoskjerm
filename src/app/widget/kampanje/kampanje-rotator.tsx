"use client"

import { useEffect, useState, type CSSProperties } from "react"
import type { LiveItem } from "@/lib/content/live"
import { OfferCard, type ChainBrand } from "@/app/widget/tilbud/offer-card"
import { CampaignCard } from "./campaign-card"
import { CompetitionCard } from "@/app/widget/_shared/competition-card"
import { GalleryCard } from "@/app/widget/_shared/gallery-card"

/**
 * Liggende kunde-kampanjeskjerm (1920×1080). Roterer butikkens kunde-slides:
 * strukturerte kampanjekort (Mobile-stil) for items med `campaign`, ellers et
 * helbilde-fallback med tittel. Egen rotasjon + periodisk reload.
 */

const DEFAULT_SECONDS = 9

const frame: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  background: "#0a0a0c",
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

/**
 * Liggende plakat/artikkel: tekstpanel til VENSTRE (kicker, tittel, punkter,
 * periode) og bildet til HØYRE (contain + uskarp fyll). Manglende/ødelagt bilde
 * gir branded gradient, aldri svart slide med brutt bilde-ikon. Fyller 1920×1080.
 */
function LandscapePoster({ item, chain, qrUrl }: { item: LiveItem; chain?: ChainBrand | null; qrUrl?: string }) {
  const [imgOk, setImgOk] = useState(true)
  const brand = chain?.color || "#0a5c2b"
  const period = formatPeriod(item.validFrom, item.validTo)
  const kicker = item.type === "news" ? "Aktuelt" : "Tilbud"
  // Media kan være video, PDF/PowerPoint, forhåndsrendret kundeavis (pages) eller
  // vanlige bilder — ikke bare imageUrl. Uten dette ble video/kundeavis vist som
  // et brutt bilde-ikon. Fallback = branded gradient, aldri svart brutt slide.
  const isVideo = item.isVideo && !!item.imageUrl
  const isDoc = (item.isPdf || item.isPpt) && !!item.imageUrl && item.pages.length === 0
  const imgUrls = item.imageUrls.length ? item.imageUrls : item.pages.length ? item.pages : item.imageUrl ? [item.imageUrl] : []
  const firstImg = imgUrls[0] ?? null
  const hasMedia = isVideo || isDoc || (!!firstImg && imgOk)
  return (
    <div style={{ position: "absolute", inset: 0, containerType: "size", overflow: "hidden", display: "flex", background: "#0a0a0c" }}>
      {/* Venstre: tekstpanel */}
      <div style={{ width: "40cqw", flex: "0 0 auto", boxSizing: "border-box", padding: "8cqh 4.5cqw", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.2cqh", background: `linear-gradient(135deg, ${brand} 0%, #0a0a0c 92%)`, position: "relative", zIndex: 2 }}>
        <span style={{ color: "#fff", opacity: 0.85, fontWeight: 800, letterSpacing: "0.4cqh", fontSize: "2.6cqh", textTransform: "uppercase" }}>{kicker}</span>
        {item.title && <h1 style={{ margin: 0, fontSize: "8.5cqh", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.2cqh" }}>{item.title}</h1>}
        {item.blocks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1cqh", maxHeight: "38cqh", overflow: "hidden" }}>
            {item.blocks.slice(0, 6).map((b, i) =>
              b.kind === "li" ? (
                <div key={i} style={{ display: "flex", gap: "1.2cqw", fontSize: "3cqh", lineHeight: 1.35, color: "rgba(255,255,255,.92)" }}>
                  <span>•</span>
                  <span>{b.text}</span>
                </div>
              ) : (
                <p key={i} style={{ margin: 0, fontSize: b.kind === "h" ? "3.6cqh" : "3cqh", fontWeight: b.kind === "h" ? 800 : 400, lineHeight: 1.35, color: "rgba(255,255,255,.92)" }}>{b.text}</p>
              )
            )}
          </div>
        )}
        {period && <span style={{ alignSelf: "flex-start", background: "#fff", color: "#0a0a0a", fontWeight: 800, fontSize: "2.8cqh", padding: "1.2cqh 3cqw", borderRadius: "100cqh", marginTop: "0.8cqh" }}>{period}</span>}
      </div>

      {/* Høyre: media (video / PDF / bilde, contain + uskarp fyll) eller branded gradient */}
      <div style={{ flex: "1 1 auto", position: "relative", overflow: "hidden", background: hasMedia ? "#0a0a0c" : `radial-gradient(120% 120% at 62% 30%, ${brand} 0%, #0a0a0c 72%)` }}>
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={item.imageUrl!} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: item.bgColor ?? "#0a0a0c" }} />
        ) : isDoc ? (
          <iframe title={item.title} src={`${item.imageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#fff" }} />
        ) : firstImg ? (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${firstImg}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px) brightness(.5)", transform: "scale(1.2)", opacity: imgOk ? 1 : 0 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firstImg} alt="" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: imgOk ? 1 : 0, animation: "grKb 18s ease-in-out infinite alternate" }} />
          </>
        ) : null}
      </div>

      {chain?.name && <span style={{ position: "absolute", right: "3cqw", top: "5cqh", fontSize: "3cqh", fontWeight: 900, letterSpacing: "0.2cqh", textShadow: "0 2px 6px rgba(0,0,0,.5)", zIndex: 3 }}>{chain.name}</span>}
      {qrUrl && (
        <div style={{ position: "absolute", right: "3cqw", bottom: "5cqh", background: "#fff", borderRadius: "1.4cqh", padding: "1.4cqh", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6cqh", boxShadow: "0 1.5cqh 4cqh rgba(0,0,0,.4)", zIndex: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR" style={{ width: "12cqh", height: "12cqh", display: "block", borderRadius: "0.5cqh" }} />
          <span style={{ color: "#0a0a0a", fontWeight: 900, fontSize: "1.6cqh", letterSpacing: "0.1cqh", textTransform: "uppercase" }}>Skann</span>
        </div>
      )}
    </div>
  )
}

export function KampanjeRotator({ items, chain = null, qr = {} }: { items: LiveItem[]; chain?: ChainBrand | null; qr?: Record<string, string> }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const it = items[i % items.length]
    const secs = it?.durationSeconds ?? DEFAULT_SECONDS
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), secs * 1000)
    return () => clearTimeout(id)
  }, [i, items])

  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 10 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const item = items.length ? items[i % items.length] : null

  return (
    <main style={frame}>
      <style>{"@keyframes grKb{from{transform:scale(1)}to{transform:scale(1.08)}}@keyframes grFade{from{opacity:0}to{opacity:1}}"}</style>
      {!item ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive kampanjer
        </div>
      ) : (
        <div key={item.id} style={{ position: "absolute", inset: 0, animation: "grFade .6s ease-out" }}>
          {item.campaign ? (
            <CampaignCard item={item} chain={chain} />
          ) : item.type === "competition" ? (
            <CompetitionCard item={item} qrUrl={qr[item.id]} />
          ) : item.type === "gallery" ? (
            <GalleryCard item={item} qrUrl={qr[item.id]} />
          ) : item.offer ? (
            <OfferCard item={item} chain={chain} orientation="landscape" />
          ) : (
            <LandscapePoster item={item} chain={chain} qrUrl={qr[item.id]} />
          )}
        </div>
      )}
    </main>
  )
}
