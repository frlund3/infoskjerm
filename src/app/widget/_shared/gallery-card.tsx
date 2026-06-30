"use client"

import { useEffect, useState } from "react"
import type { LiveItem } from "@/lib/content/live"

/**
 * Råflott galleri-kort med WOW: Ken Burns-zoom, lys-sveip, svevende gnister,
 * animert prislapp (pop + puls) og glødende QR. Veksler mellom varer med myk
 * slide-inn.
 * - Kundeskjerm (portrait): bilde i full bredde med tekst/pris nederst.
 * - Bakrom (landscape): tekst + pris til venstre, produktbilde til høyre.
 */

type Theme = "catering" | "meny" | "ansattilbud"

const THEMES: Record<Theme, { bg: string; accent: string; ink: string; kicker: string; spark: string }> = {
  catering: { bg: "linear-gradient(135deg,#1c1207 0%,#3d2410 50%,#7a3e12 100%)", accent: "#f59e0b", ink: "#1c1207", kicker: "Catering", spark: "✨" },
  meny: { bg: "linear-gradient(135deg,#0a0a0a 0%,#1a1320 55%,#2a2030 100%)", accent: "#f5c451", ink: "#0a0a0a", kicker: "Meny", spark: "✦" },
  ansattilbud: { bg: "linear-gradient(135deg,#052e1a 0%,#0a4a2a 55%,#16a34a 100%)", accent: "#bbf7d0", ink: "#052e1a", kicker: "Ansattilbud", spark: "✦" },
}

const ROTATE_MS = 4500

const KEYFRAMES = `
@keyframes grGalIn{0%{opacity:0;transform:translateX(46px) scale(.97)}100%{opacity:1;transform:none}}
@keyframes grGalRise{0%{opacity:0;transform:translateY(30px)}100%{opacity:1;transform:none}}
@keyframes grGalPop{0%{opacity:0;transform:scale(.5)}62%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
@keyframes grGalPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes grGalKen{0%{transform:scale(1.02)}100%{transform:scale(1.14)}}
@keyframes grGalShine{0%{transform:translateX(-60%) skewX(-12deg)}100%{transform:translateX(240%) skewX(-12deg)}}
@keyframes grGalFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
@keyframes grGalDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(26px,-28px)}}
@keyframes grGalGlow{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 22px var(--gal-accent))}}
@keyframes grGalSheen{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
`

export function GalleryCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const g = item.gallery
  const items = g?.items ?? []
  const theme = THEMES[(g?.theme as Theme) ?? "catering"] ?? THEMES.catering
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [items.length])

  const fg = item.textColor ?? "#fff"
  const accent = theme.accent
  const current = items[idx % Math.max(1, items.length)] ?? null
  const pad = portrait ? 64 : 78

  const heading = (
    <div style={{ flex: "0 0 auto" }}>
      <p style={{ margin: 0, color: accent, fontWeight: 800, letterSpacing: 5, fontSize: portrait ? 30 : 26, textTransform: "uppercase", animation: "grGalRise .7s ease-out both" }}>{theme.kicker}</p>
      <h1 style={{ margin: "10px 0 0", fontSize: portrait ? 92 : 76, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, textShadow: "0 6px 30px rgba(0,0,0,.35)", animation: "grGalRise .8s ease-out both" }}>{item.title}</h1>
      <div style={{ marginTop: 14, height: 6, width: portrait ? 160 : 130, borderRadius: 9999, background: accent, boxShadow: `0 0 18px ${accent}`, animation: "grGalPop .7s ease-out both" }} />
    </div>
  )

  // Price tag — hugs content, pops in then pulses, with a sliding sheen.
  const priceTag = (big: boolean) =>
    current && (current.price || current.priceInfo) ? (
      <div style={{ position: "relative", overflow: "hidden", display: "inline-flex", alignSelf: "flex-start", width: "fit-content", alignItems: "baseline", gap: 12, background: accent, color: theme.ink, fontWeight: 900, padding: big ? "16px 34px" : "12px 28px", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,.35)", animation: "grGalPop .6s cubic-bezier(.2,1.5,.4,1) both, grGalPulse 2.8s ease-in-out 1s infinite" }}>
        {current.price && <span style={{ fontSize: big ? 76 : 58 }}>{current.price}</span>}
        {current.priceInfo && <span style={{ fontSize: big ? 32 : 28, fontWeight: 800, opacity: 0.85 }}>{current.priceInfo}</span>}
        <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "45%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)", animation: "grGalSheen 3.2s ease-in-out 1.2s infinite", pointerEvents: "none" }} />
      </div>
    ) : null

  const kenImg = current?.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={current.imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "grGalKen 5s ease-out both" }} />
  ) : (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 130, opacity: 0.5 }}>🍽️</div>
  )

  // Shine bar that sweeps across an image box.
  const shine = (
    <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 200, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)", animation: "grGalShine 6s linear 1s infinite", pointerEvents: "none" }} />
  )

  // Portrait (kundeskjerm): full-bleed image with name/price overlaid at the bottom.
  const featuredFull = current && (
    <div key={idx} style={{ position: "relative", flex: "1 1 auto", minHeight: 0, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.45)", background: "rgba(255,255,255,.06)", animation: "grGalIn .8s cubic-bezier(.16,1,.3,1) both" }}>
      {kenImg}
      {shine}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.12) 46%, transparent 70%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 44, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={{ margin: 0, fontSize: 66, fontWeight: 900, lineHeight: 1.05, textShadow: "0 4px 20px rgba(0,0,0,.5)", animation: "grGalRise .7s ease-out .1s both" }}>{current.name}</h2>
        {priceTag(false)}
      </div>
    </div>
  )

  // Landscape (bakrom): text + price LEFT, product image RIGHT.
  const featuredSplit = current && (
    <div key={idx} style={{ flex: "1 1 auto", minHeight: 0, display: "flex", gap: 54, alignItems: "stretch" }}>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <h2 style={{ margin: 0, fontSize: 80, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1, textShadow: "0 4px 20px rgba(0,0,0,.35)", animation: "grGalRise .7s ease-out .05s both" }}>{current.name}</h2>
        {priceTag(true)}
      </div>
      <div style={{ position: "relative", flex: "0 0 52%", minWidth: 0, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.45)", background: "rgba(255,255,255,.06)", animation: "grGalIn .8s cubic-bezier(.16,1,.3,1) both" }}>
        {kenImg}
        {shine}
      </div>
    </div>
  )

  const dots = items.length > 1 && (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {items.map((_, i) => (
        <span key={i} style={{ width: i === idx ? 46 : 14, height: 14, borderRadius: 9999, background: i === idx ? accent : "rgba(255,255,255,.3)", boxShadow: i === idx ? `0 0 16px ${accent}` : "none", transition: "all .4s cubic-bezier(.16,1,.3,1)" }} />
      ))}
    </div>
  )

  const qrPanel = qrUrl && (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 22, background: "rgba(255,255,255,.08)", borderRadius: 22, padding: portrait ? "20px 28px" : "16px 22px" }}>
      <div style={{ background: "#fff", padding: 12, borderRadius: 14, animation: "grGalGlow 2.6s ease-in-out infinite" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR-kode" width={portrait ? 170 : 130} height={portrait ? 170 : 130} style={{ display: "block" }} />
      </div>
      <div style={{ fontSize: portrait ? 38 : 32, fontWeight: 900, color: accent, maxWidth: 300, lineHeight: 1.1 }}>{g?.qrLabel || "Skann her"}</div>
    </div>
  )

  // Drifting sparkles in the theme accent for atmosphere.
  const sparkles = ([["8%", "20%", 0], ["90%", "16%", 1.1], ["14%", "82%", 2], ["86%", "78%", 0.6], ["50%", "10%", 1.6]] as const).map(([left, top, d], i) => (
    <span key={i} style={{ position: "absolute", left, top, fontSize: 40, color: accent, opacity: 0.7, animation: `grGalFloat ${4 + (i % 3)}s ease-in-out ${d}s infinite`, pointerEvents: "none", textShadow: `0 0 16px ${accent}` }}>{theme.spark}</span>
  ))

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: fg, background: item.bgColor ?? theme.bg, fontFamily: "Arial, Helvetica, sans-serif", ["--gal-accent" as string]: accent }}>
      <style>{KEYFRAMES}</style>
      {/* Drifting glow blobs */}
      <div style={{ position: "absolute", top: -160, right: -120, width: 540, height: 540, borderRadius: "50%", background: `radial-gradient(circle, ${accent}22, transparent 70%)`, animation: "grGalDrift 12s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: -200, left: -140, width: 560, height: 560, borderRadius: "50%", background: "rgba(0,0,0,.18)", animation: "grGalDrift 16s ease-in-out 2s infinite" }} />
      {/* Big diagonal light sweep across the whole card */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 260, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent)", animation: "grGalShine 9s linear infinite" }} />
      </div>
      {sparkles}

      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 30, boxSizing: "border-box" }}>
          {heading}
          {featuredFull}
          <div style={{ display: "flex", justifyContent: "center" }}>{dots}</div>
          {qrUrl && <div style={{ display: "flex", justifyContent: "center" }}>{qrPanel}</div>}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 32, boxSizing: "border-box" }}>
          {heading}
          {featuredSplit}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div>{dots}</div>
            {qrUrl && qrPanel}
          </div>
        </div>
      )}
    </div>
  )
}
