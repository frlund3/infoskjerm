import type { LiveItem, OfferFields } from "@/lib/content/live"

/**
 * A structured retail offer as a bold SPAR/EUROSPAR-style poster, portrait-first:
 *   • top: product name + info, full width
 *   • middle: product image, full width, with a tilted red price/discount circle
 *     and a tilted badge ribbon laid over it
 *   • bottom: multi-buy + before-price + fine print, period, and the chain logo
 * Sized in `vmin` so it scales on the portrait customer screens. A generic
 * "Gange-Rolv" name is never shown to customers — only the chain logo.
 */

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
  return (
    <div
      style={{
        position: "absolute", bottom: "1vmin", right: "0vmin",
        width: "42vmin", height: "42vmin", borderRadius: "50%",
        background: RED, color: "#fff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        transform: "rotate(-8deg)", boxShadow: "0 1.5vmin 5vmin rgba(0,0,0,.22)",
      }}
    >
      {offer.rabatt ? (
        <span style={{ fontSize: "16vmin", fontWeight: 900, lineHeight: 0.85, letterSpacing: "-0.6vmin" }}>{offer.rabatt}</span>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", lineHeight: 0.8 }}>
          <span style={{ fontSize: "22vmin", fontWeight: 900, letterSpacing: "-0.6vmin" }}>{kr}</span>
          {ore && <span style={{ fontSize: "9vmin", fontWeight: 900, marginTop: "2vmin" }}>{ore}</span>}
        </div>
      )}
    </div>
  )
}

function BrandFooter({ chain }: { chain: ChainBrand | null }) {
  if (!chain || (!chain.logoUrl && !chain.name)) return null
  const accent = chain.color || GREEN
  return (
    <div style={{ flex: "0 0 auto", marginTop: "3vmin", marginLeft: "-5vmin", marginRight: "-5vmin", borderTop: `0.8vmin solid ${accent}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2.5vmin 5vmin", minHeight: "9vmin", boxSizing: "border-box" }}>
      {chain.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: "11vmin", maxWidth: "60%", objectFit: "contain" }} />
      ) : (
        <span style={{ color: accent, fontWeight: 900, letterSpacing: "0.5vmin", fontSize: "5vmin", textTransform: "uppercase" }}>{chain.name}</span>
      )}
    </div>
  )
}

export function OfferCard({ item, chain = null }: { item: LiveItem; chain?: ChainBrand | null }) {
  const offer = item.offer
  if (!offer) return null
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.pant ? "+ pant" : null, offer.maks, offer.enhetspris].filter(Boolean) as string[]

  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", flexDirection: "column", padding: "5vmin 5vmin 0", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Top: name + info, full width */}
      <div style={{ flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "11vmin", fontWeight: 900, margin: 0, lineHeight: 0.98, letterSpacing: "-0.4vmin" }}>{offer.varenavn}</h1>
        {offer.vareinfo && <p style={{ fontSize: "4.6vmin", color: MUTED, margin: "1.8vmin 0 0", fontWeight: 600 }}>{offer.vareinfo}</p>}
      </div>

      {/* Middle: full-width image with badge ribbon + price circle over it */}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", margin: "3vmin 0" }}>
        {img && <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />}
        {offer.badge && (
          <div style={{ position: "absolute", top: "9vmin", left: "-1vmin", background: RED, color: "#fff", fontWeight: 900, fontSize: "5.5vmin", letterSpacing: "0.3vmin", padding: "1.6vmin 4.5vmin", borderRadius: "1.5vmin", textTransform: "uppercase", transform: "rotate(-4deg)", boxShadow: "0 1vmin 3vmin rgba(0,0,0,.18)" }}>
            {offer.badge}
          </div>
        )}
        {(offer.rabatt || offer.pris) && <PriceCircle offer={offer} />}
      </div>

      {/* Bottom: multi-buy + before-price + fine print + period */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4vmin" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1vmin", minWidth: 0 }}>
          {offer.mengde && <span style={{ fontSize: "9vmin", fontWeight: 900, color: INK, lineHeight: 1 }}>{offer.mengde}</span>}
          {offer.forpris && <span style={{ fontSize: "4vmin", color: "#9aa0a6", fontWeight: 700 }}>Førpris <span style={{ textDecoration: "line-through" }}>{/[.,]/.test(offer.forpris) ? offer.forpris : `${offer.forpris},00`}</span></span>}
          {fine.length > 0 && <span style={{ fontSize: "3.6vmin", color: MUTED, fontWeight: 600 }}>{fine.join("  ·  ")}</span>}
        </div>
        {period && <span style={{ flex: "0 0 auto", background: GREEN, color: "#fff", fontWeight: 800, fontSize: "3.6vmin", padding: "1.4vmin 3.4vmin", borderRadius: "100vmin" }}>{period}</span>}
      </div>

      <BrandFooter chain={chain} />
    </div>
  )
}
