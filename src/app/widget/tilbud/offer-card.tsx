import type { LiveItem, OfferFields } from "@/lib/content/live"
import { SPACE, RADIUS, SHADOW, pad, typeScale } from "@/app/widget/_shared/tokens"

/**
 * A structured retail offer as a bold SPAR/EUROSPAR-style poster.
 *   • Portrait (kundeskjerm 9:16): name top, product image with a tilted red
 *     price/discount circle in the middle, fine print + period + logo bottom.
 *   • Landscape (kampanje/bakrom 16:9): horizontal split — product image LEFT
 *     with the price circle, name + info + fine print + period + logo RIGHT.
 * Portrait is sized in `cqmin` (unchanged, proven); landscape uses the shared
 * design tokens. A generic "Gange-Rolv" name is never shown — only the chain logo.
 */

export type Orientation = "portrait" | "landscape"

export interface ChainBrand {
  name: string
  logoUrl: string | null
  color: string
  brandFg: string | null
}

const RED = "#e4002b"
const GREEN = "#16a34a"
const INK = "#0a0a0a"
const MUTED = "#5f6368"

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

/** Red circle over the image: a discount ("-30%") or a kr/øre price. */
function PriceCircle({ offer }: { offer: OfferFields }) {
  // Whole kroner → "00" øre (best practice: 99 shows as 99⁰⁰).
  const [kr, oreRaw] = (offer.pris ?? "").split(/[.,]/)
  const ore = (oreRaw ?? "00").padEnd(2, "0").slice(0, 2)
  // Scale the kroner down as it grows so "999" or "1299" still fit the circle
  // (this chain caps prices at 4 kroner digits).
  const krDigits = kr.replace(/\D/g, "").length
  const krSize = krDigits >= 4 ? 13 : krDigits === 3 ? 17 : 22
  const oreSize = krDigits >= 4 ? 6 : krDigits === 3 ? 7.5 : 9
  return (
    <div
      style={{
        position: "absolute", bottom: "1cqmin", right: "0cqmin",
        width: "42cqmin", height: "42cqmin", borderRadius: "50%",
        background: RED, color: "#fff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        transform: "rotate(-8deg)", boxShadow: "0 1.5cqmin 5cqmin rgba(0,0,0,.22)",
        padding: "0 2cqmin", boxSizing: "border-box",
        animation: "grOcPop .6s cubic-bezier(.2,1.5,.4,1) both, grOcGlow 2.6s ease-in-out 0.8s infinite",
      }}
    >
      {offer.rabatt ? (
        <span style={{ fontSize: "16cqmin", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.6cqmin" }}>{offer.rabatt}</span>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", lineHeight: 0.8 }}>
          <span style={{ fontSize: `${krSize}cqmin`, fontWeight: 900, letterSpacing: "-0.6cqmin" }}>{kr}</span>
          {ore && <span style={{ fontSize: `${oreSize}cqmin`, fontWeight: 900, marginTop: "1.5cqmin" }}>{ore}</span>}
        </div>
      )}
    </div>
  )
}

function BrandFooter({ chain }: { chain: ChainBrand | null }) {
  if (!chain || (!chain.logoUrl && !chain.name)) return null
  const accent = chain.color || GREEN
  return (
    <div style={{ flex: "0 0 auto", marginTop: "3cqmin", marginLeft: "-5cqmin", marginRight: "-5cqmin", borderTop: `0.8cqmin solid ${accent}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2.5cqmin 5cqmin", minHeight: "9cqmin", boxSizing: "border-box" }}>
      {chain.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: "11cqmin", maxWidth: "60%", objectFit: "contain" }} />
      ) : (
        <span style={{ color: accent, fontWeight: 900, letterSpacing: "0.5cqmin", fontSize: "5cqmin", textTransform: "uppercase" }}>{chain.name}</span>
      )}
    </div>
  )
}

export function OfferCard({ item, chain = null, orientation = "portrait" }: { item: LiveItem; chain?: ChainBrand | null; orientation?: Orientation }) {
  if (!item.offer) return null
  return orientation === "landscape"
    ? <LandscapeOffer item={item} offer={item.offer} chain={chain} />
    : <PortraitOffer item={item} offer={item.offer} chain={chain} />
}

const OC_KEYFRAMES = `@keyframes grOcShine{0%{transform:translateX(-60%) skewX(-14deg)}100%{transform:translateX(260%) skewX(-14deg)}}@keyframes grOcPop{from{transform:rotate(-8deg) scale(.55);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:1}}@keyframes grOcGlow{0%,100%{box-shadow:0 1.5cqmin 5cqmin rgba(0,0,0,.22)}50%{box-shadow:0 1.5cqmin 7cqmin rgba(228,0,43,.5)}}@keyframes grOcKen{from{transform:scale(1)}to{transform:scale(1.07)}}@keyframes grOcWobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(-8deg)}}`

/** LIGGENDE (16:9): produktbilde til venstre med pris-sirkel, navn + info + finpris
 *  + periode + logo til høyre. Token-basert (px). */
function LandscapeOffer({ item, offer, chain }: { item: LiveItem; offer: OfferFields; chain: ChainBrand | null }) {
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.pant ? "+ pant" : null, offer.maks, offer.enhetspris].filter(Boolean) as string[]
  const t = typeScale(false)
  const accent = chain?.color || GREEN
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", containerType: "size", overflow: "hidden", display: "flex", fontFamily: "Arial, Helvetica, sans-serif", color: INK }}>
      <style>{OC_KEYFRAMES}</style>
      {/* Venstre: bilde + badge + pris-sirkel */}
      <div style={{ flex: "0 0 50%", position: "relative", minWidth: 0, background: "#f6f7f8" }}>
        {img && <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", animation: "grOcKen 14s ease-in-out infinite alternate" }} />}
        {offer.badge && (
          <div style={{ position: "absolute", top: 60, left: -8, background: RED, color: "#fff", fontWeight: 900, fontSize: t.h3, letterSpacing: 1, padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.md, textTransform: "uppercase", transform: "rotate(-4deg)", transformOrigin: "left center", boxShadow: SHADOW.soft, animation: "grOcWobble 3.2s ease-in-out infinite" }}>
            {offer.badge}
          </div>
        )}
        {(offer.rabatt || offer.pris) && <PriceCircle offer={offer} />}
      </div>
      {/* Høyre: navn + info + finpris + periode + logo */}
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: pad(false), boxSizing: "border-box" }}>
        <h1 style={{ fontSize: t.hero, fontWeight: 900, margin: 0, lineHeight: 0.96, letterSpacing: -2, overflowWrap: "break-word" }}>{offer.varenavn}</h1>
        {offer.vareinfo && <p style={{ fontSize: t.h3, color: MUTED, margin: `${SPACE.sm}px 0 0`, fontWeight: 600 }}>{offer.vareinfo}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm, marginTop: SPACE.lg, alignItems: "flex-start" }}>
          {offer.tag && <span style={{ background: GREEN, color: "#fff", fontWeight: 900, fontSize: t.h3, padding: `${SPACE.xs}px ${SPACE.md}px`, borderRadius: RADIUS.md, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1 }}>{offer.tag}</span>}
          {offer.forpris && <span style={{ fontSize: t.body, color: "#9aa0a6", fontWeight: 700 }}>Førpris <span style={{ textDecoration: "line-through" }}>{offer.forpris}</span></span>}
          {fine.length > 0 && <span style={{ fontSize: t.label, color: MUTED, fontWeight: 600 }}>{fine.join("  ·  ")}</span>}
          {period && <span style={{ background: GREEN, color: "#fff", fontWeight: 800, fontSize: t.body, padding: `${SPACE.xs}px ${SPACE.md}px`, borderRadius: RADIUS.pill }}>{period}</span>}
        </div>
        {chain && (chain.logoUrl || chain.name) && (
          <div style={{ marginTop: SPACE.xl, borderTop: `4px solid ${accent}`, paddingTop: SPACE.md }}>
            {chain.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: 90, maxWidth: "60%", objectFit: "contain" }} />
              : <span style={{ color: accent, fontWeight: 900, fontSize: t.h3, textTransform: "uppercase", letterSpacing: 1 }}>{chain.name}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/** STÅENDE (9:16): uendret SPAR-plakat (cqmin). */
function PortraitOffer({ item, offer, chain }: { item: LiveItem; offer: OfferFields; chain: ChainBrand | null }) {
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.pant ? "+ pant" : null, offer.maks, offer.enhetspris].filter(Boolean) as string[]

  return (
    // Outer establishes a size container so the card scales to its box (full
    // screen on signage, a small box in the CMS live preview) — cqmin == vmin
    // when it fills the viewport, so the on-screen look is unchanged.
    <div style={{ position: "absolute", inset: 0, background: "#fff", containerType: "size", overflow: "hidden" }}>
    <style>{`@keyframes grOcShine{0%{transform:translateX(-60%) skewX(-14deg)}100%{transform:translateX(260%) skewX(-14deg)}}@keyframes grOcPop{from{transform:rotate(-8deg) scale(.55);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:1}}@keyframes grOcGlow{0%,100%{box-shadow:0 1.5cqmin 5cqmin rgba(0,0,0,.22)}50%{box-shadow:0 1.5cqmin 7cqmin rgba(228,0,43,.5)}}@keyframes grOcKen{from{transform:scale(1)}to{transform:scale(1.07)}}@keyframes grOcWobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(-8deg)}}`}</style>
    {/* Soft moving shine sweep for a premium feel. */}
    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "34cqmin", background: "linear-gradient(90deg,transparent,rgba(0,0,0,.07),transparent)", animation: "grOcShine 4.5s ease-in-out infinite", pointerEvents: "none", zIndex: 5 }} />
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", flexDirection: "column", padding: "5cqmin 5cqmin 0", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Top: name + info, full width */}
      <div style={{ flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "11cqmin", fontWeight: 900, margin: 0, lineHeight: 0.98, letterSpacing: "-0.4cqmin" }}>{offer.varenavn}</h1>
        {offer.vareinfo && <p style={{ fontSize: "4.6cqmin", color: MUTED, margin: "1.8cqmin 0 0", fontWeight: 600 }}>{offer.vareinfo}</p>}
      </div>

      {/* Middle: full-width image with badge ribbon + price circle over it */}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", margin: "3cqmin 0" }}>
        {img && <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", animation: "grOcKen 14s ease-in-out infinite alternate" }} />}
        {offer.badge && (
          <div style={{ position: "absolute", top: "9cqmin", left: "-1cqmin", background: RED, color: "#fff", fontWeight: 900, fontSize: "5.5cqmin", letterSpacing: "0.3cqmin", padding: "1.6cqmin 4.5cqmin", borderRadius: "1.5cqmin", textTransform: "uppercase", transform: "rotate(-4deg)", transformOrigin: "left center", boxShadow: "0 1cqmin 3cqmin rgba(0,0,0,.18)", animation: "grOcWobble 3.2s ease-in-out infinite" }}>
            {offer.badge}
          </div>
        )}
        {(offer.rabatt || offer.pris) && <PriceCircle offer={offer} />}
      </div>

      {/* Bottom: multi-buy + before-price + fine print + period */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4cqmin" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.8cqmin", minWidth: 0, alignItems: "flex-start" }}>
          {offer.tag && <span style={{ background: GREEN, color: "#fff", fontWeight: 900, fontSize: "5cqmin", padding: "1.4cqmin 3.6cqmin", borderRadius: "1.6cqmin", textTransform: "uppercase", letterSpacing: "0.2cqmin", lineHeight: 1 }}>{offer.tag}</span>}
          {offer.forpris && <span style={{ fontSize: "4cqmin", color: "#9aa0a6", fontWeight: 700 }}>Førpris <span style={{ textDecoration: "line-through" }}>{offer.forpris}</span></span>}
          {fine.length > 0 && <span style={{ fontSize: "3.6cqmin", color: MUTED, fontWeight: 600 }}>{fine.join("  ·  ")}</span>}
        </div>
        {period && <span style={{ flex: "0 0 auto", background: GREEN, color: "#fff", fontWeight: 800, fontSize: "3.6cqmin", padding: "1.4cqmin 3.4cqmin", borderRadius: "100cqmin" }}>{period}</span>}
      </div>

      <BrandFooter chain={chain} />
    </div>
    </div>
  )
}
