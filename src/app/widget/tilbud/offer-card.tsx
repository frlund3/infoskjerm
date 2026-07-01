import type { LiveItem, OfferFields } from "@/lib/content/live"

/**
 * A structured retail offer as a bold SPAR/EUROSPAR-style poster.
 *
 * PORTRAIT (default, 9:16) — vertical stacking, unchanged:
 *   • top: product name + info, full width
 *   • middle: product image, full width, with a tilted red price/discount circle
 *     and a tilted badge ribbon laid over it
 *   • bottom: multi-buy + before-price + fine print, period, and the chain logo
 *   Sized in `cqmin` so it scales on the portrait customer screens.
 *
 * LANDSCAPE (16:9) — horizontal split so it fills 1920×1080 deliberately:
 *   • left ~40%: product name + info + red price/discount circle + tag / before-
 *     price / fine print / period + chain logo footer
 *   • right ~60%: product image (contain) over a soft branded backdrop
 *   Sized in `cqh`/`cqw` (never `cqmin`, which = shortest side and would make it
 *   tiny/cramped in a wide box).
 *
 * A generic "Gange-Rolv" name is never shown to customers — only the chain logo.
 */

export interface ChainBrand {
  name: string
  logoUrl: string | null
  color: string
  brandFg: string | null
}

type Orientation = "portrait" | "landscape"

const RED = "#e4002b"
const GREEN = "#16a34a"
const INK = "#0a0a0a"
const MUTED = "#5f6368"

const OC_KEYFRAMES = `@keyframes grOcShine{0%{transform:translateX(-60%) skewX(-14deg)}100%{transform:translateX(260%) skewX(-14deg)}}@keyframes grOcPop{from{transform:rotate(-8deg) scale(.55);opacity:0}to{transform:rotate(-8deg) scale(1);opacity:1}}@keyframes grOcGlow{0%,100%{box-shadow:0 1.5cqmin 5cqmin rgba(0,0,0,.22)}50%{box-shadow:0 1.5cqmin 7cqmin rgba(228,0,43,.5)}}@keyframes grOcKen{from{transform:scale(1)}to{transform:scale(1.07)}}@keyframes grOcWobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(-8deg)}}`

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

/**
 * Red circle over the image: a discount ("-30%") or a kr/øre price.
 * `unit` picks the container-query axis: `cqmin` in portrait, `cqh` in landscape
 * (so the circle stays a sensible fraction of the — much shorter — height).
 */
function PriceCircle({ offer, unit }: { offer: OfferFields; unit: "cqmin" | "cqh" }) {
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
        width: `42${unit}`, height: `42${unit}`, borderRadius: "50%",
        background: RED, color: "#fff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        transform: "rotate(-8deg)", boxShadow: "0 1.5cqmin 5cqmin rgba(0,0,0,.22)",
        padding: `0 2${unit}`, boxSizing: "border-box", flex: "0 0 auto",
        animation: "grOcPop .6s cubic-bezier(.2,1.5,.4,1) both, grOcGlow 2.6s ease-in-out 0.8s infinite",
      }}
    >
      {offer.rabatt ? (
        <span style={{ fontSize: `16${unit}`, fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.6cqmin" }}>{offer.rabatt}</span>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", lineHeight: 0.8 }}>
          <span style={{ fontSize: `${krSize}${unit}`, fontWeight: 900, letterSpacing: "-0.6cqmin" }}>{kr}</span>
          {ore && <span style={{ fontSize: `${oreSize}${unit}`, fontWeight: 900, marginTop: "1.5cqmin" }}>{ore}</span>}
        </div>
      )}
    </div>
  )
}

function PortraitBrandFooter({ chain }: { chain: ChainBrand | null }) {
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

/** Chain logo for the landscape text panel — sized in `cqh`, no negative bleed. */
function LandscapeBrandMark({ chain }: { chain: ChainBrand | null }) {
  if (!chain || (!chain.logoUrl && !chain.name)) return null
  const accent = chain.color || GREEN
  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "flex-start", paddingTop: "2.4cqh", marginTop: "1cqh", borderTop: `0.6cqh solid ${accent}` }}>
      {chain.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: "9cqh", maxWidth: "70%", objectFit: "contain", objectPosition: "left center" }} />
      ) : (
        <span style={{ color: accent, fontWeight: 900, letterSpacing: "0.4cqh", fontSize: "4cqh", textTransform: "uppercase" }}>{chain.name}</span>
      )}
    </div>
  )
}

interface CardParts {
  offer: OfferFields
  img: string | null
  period: string | null
  fine: string[]
  chain: ChainBrand | null
}

/** PORTRAIT (9:16) — the original design, byte-for-byte unchanged in look. */
function PortraitCard({ offer, img, period, fine, chain }: CardParts) {
  return (
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
        {(offer.rabatt || offer.pris) && (
          <div style={{ position: "absolute", bottom: "1cqmin", right: "0cqmin" }}>
            <PriceCircle offer={offer} unit="cqmin" />
          </div>
        )}
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

      <PortraitBrandFooter chain={chain} />
    </div>
  )
}

/**
 * LANDSCAPE (16:9) — horizontal split: content panel left (~40cqw), product
 * image right (~60cqw, contain over a soft branded backdrop). All type/padding
 * in `cqh`/`cqw` so it stays crisp and resolution-independent on 1920×1080.
 */
function LandscapeCard({ offer, img, period, fine, chain }: CardParts) {
  const accent = chain?.color || GREEN
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Left: content panel */}
      <div style={{ width: "40cqw", flex: "0 0 auto", boxSizing: "border-box", padding: "7cqh 4cqw", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.6cqh", position: "relative", zIndex: 2, background: "#fff", borderRight: `0.5cqh solid rgba(0,0,0,.06)` }}>
        {offer.badge && (
          <span style={{ alignSelf: "flex-start", background: RED, color: "#fff", fontWeight: 900, fontSize: "3cqh", letterSpacing: "0.3cqh", padding: "1.2cqh 2.4cqw", borderRadius: "1cqh", textTransform: "uppercase", transform: "rotate(-3deg)", transformOrigin: "left center", boxShadow: "0 0.8cqh 2.4cqh rgba(0,0,0,.18)", animation: "grOcWobble 3.2s ease-in-out infinite" }}>
            {offer.badge}
          </span>
        )}

        <div style={{ flex: "0 0 auto" }}>
          <h1 style={{ fontSize: "9cqh", fontWeight: 900, margin: 0, lineHeight: 0.96, letterSpacing: "-0.25cqh" }}>{offer.varenavn}</h1>
          {offer.vareinfo && <p style={{ fontSize: "3.4cqh", color: MUTED, margin: "1.6cqh 0 0", fontWeight: 600, lineHeight: 1.3 }}>{offer.vareinfo}</p>}
        </div>

        {(offer.rabatt || offer.pris) && (
          <div style={{ display: "flex", alignItems: "center", gap: "2.5cqw", marginTop: "0.5cqh" }}>
            <PriceCircle offer={offer} unit="cqh" />
            {offer.forpris && (
              <span style={{ fontSize: "3cqh", color: "#9aa0a6", fontWeight: 700 }}>
                Førpris <span style={{ textDecoration: "line-through" }}>{offer.forpris}</span>
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.6cqh 2cqw" }}>
          {offer.tag && <span style={{ background: GREEN, color: "#fff", fontWeight: 900, fontSize: "3cqh", padding: "1.1cqh 2.4cqw", borderRadius: "1cqh", textTransform: "uppercase", letterSpacing: "0.15cqh", lineHeight: 1 }}>{offer.tag}</span>}
          {period && <span style={{ background: GREEN, color: "#fff", fontWeight: 800, fontSize: "2.6cqh", padding: "1.1cqh 2.4cqw", borderRadius: "100cqh" }}>{period}</span>}
        </div>
        {fine.length > 0 && <span style={{ fontSize: "2.4cqh", color: MUTED, fontWeight: 600 }}>{fine.join("  ·  ")}</span>}

        <LandscapeBrandMark chain={chain} />
      </div>

      {/* Right: product image (contain) over a soft branded backdrop */}
      <div style={{ flex: "1 1 auto", position: "relative", overflow: "hidden", background: `radial-gradient(120% 120% at 62% 32%, ${accent}14 0%, #fff 70%)` }}>
        {img && <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", margin: "5cqh 4cqw", animation: "grOcKen 14s ease-in-out infinite alternate" }} />}
      </div>
    </div>
  )
}

export function OfferCard({
  item,
  chain = null,
  orientation = "portrait",
}: {
  item: LiveItem
  chain?: ChainBrand | null
  orientation?: Orientation
}) {
  const offer = item.offer
  if (!offer) return null
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.pant ? "+ pant" : null, offer.maks, offer.enhetspris].filter(Boolean) as string[]
  const parts: CardParts = { offer, img, period, fine, chain }

  return (
    // Outer establishes a size container so the card scales to its box (full
    // screen on signage, a small box in the CMS live preview) — cqmin == vmin
    // when it fills the viewport, so the on-screen look is unchanged.
    <div style={{ position: "absolute", inset: 0, background: "#fff", containerType: "size", overflow: "hidden" }}>
      <style>{OC_KEYFRAMES}</style>
      {/* Soft moving shine sweep for a premium feel. */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "34cqmin", background: "linear-gradient(90deg,transparent,rgba(0,0,0,.07),transparent)", animation: "grOcShine 4.5s ease-in-out infinite", pointerEvents: "none", zIndex: 5 }} />
      {orientation === "landscape" ? <LandscapeCard {...parts} /> : <PortraitCard {...parts} />}
    </div>
  )
}
