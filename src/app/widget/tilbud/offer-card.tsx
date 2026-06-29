import type { LiveItem, OfferFields } from "@/lib/content/live"

/**
 * A structured retail offer rendered as a bold landscape price card
 * (SPAR/EUROSPAR style): a left column with badge, product name, big price /
 * discount and fine print, and a right column with a large product image that
 * fills the full height. Sized in `vmin` so it scales with screen resolution on
 * the 16:9 customer screens. The chain logo (per store) shows in a slim footer;
 * a generic "Gange-Rolv" is never shown to customers.
 */

/** Branding for the store's chain, used for the footer logo and badge accent. */
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

/** Big red price: kroner large, øre small and raised (Norwegian convention). */
function PriceTag({ offer }: { offer: OfferFields }) {
  const [kr, ore] = (offer.pris ?? "").split(/[.,]/)
  return (
    <div style={{ display: "flex", alignItems: "flex-start", color: RED, lineHeight: 0.8 }}>
      <span style={{ fontSize: "27vmin", fontWeight: 900, letterSpacing: "-1vmin" }}>{kr}</span>
      {ore && <span style={{ fontSize: "11vmin", fontWeight: 900, marginTop: "1.6vmin" }}>{ore}</span>}
    </div>
  )
}

/** Chain-logo footer. Omitted entirely when the store has no chain logo. */
function BrandFooter({ chain }: { chain: ChainBrand | null }) {
  if (!chain?.logoUrl) return null
  const accent = chain.color || GREEN
  return (
    <div style={{ flex: "0 0 auto", marginTop: "3vmin", marginLeft: "-6vmin", marginRight: "-6vmin", borderTop: `0.8vmin solid ${accent}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2vmin", minHeight: "8vmin", boxSizing: "border-box" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: "8vmin", maxWidth: "55%", objectFit: "contain" }} />
    </div>
  )
}

export function OfferCard({ item, chain = null }: { item: LiveItem; chain?: ChainBrand | null }) {
  const offer = item.offer
  if (!offer) return null
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.enhetspris, offer.maks, offer.pant ? "+ pant" : null].filter(Boolean) as string[]
  const badgeBg = chain?.color ?? RED
  const badgeFg = chain?.brandFg ?? "#fff"

  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", flexDirection: "column", padding: "5vmin 6vmin", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Top bar: badge + period */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "3vmin" }}>
        {offer.badge && (
          <span style={{ background: badgeBg, color: badgeFg, fontWeight: 900, fontSize: "4.4vmin", letterSpacing: "0.3vmin", padding: "1.3vmin 4vmin", borderRadius: "100vmin", textTransform: "uppercase" }}>{offer.badge}</span>
        )}
        {period && <span style={{ marginLeft: "auto", background: GREEN, color: "#fff", fontWeight: 800, fontSize: "3vmin", padding: "1.2vmin 2.8vmin", borderRadius: "100vmin" }}>{period}</span>}
      </div>

      {/* Main: text column + large image column */}
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", gap: "4vmin", alignItems: "stretch", marginTop: "2.5vmin" }}>
        {/* Left: name + price */}
        <div style={{ flex: "0 0 46%", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontSize: "10vmin", fontWeight: 900, margin: 0, lineHeight: 0.98, letterSpacing: "-0.3vmin" }}>{offer.varenavn}</h1>
          {offer.vareinfo && <p style={{ fontSize: "3.8vmin", color: MUTED, margin: "1.6vmin 0 0" }}>{offer.vareinfo}</p>}

          <div style={{ flex: "1 1 auto", minHeight: "2vmin" }} />

          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "0.8vmin" }}>
            {offer.mengde && <span style={{ fontSize: "7vmin", fontWeight: 900, color: INK, lineHeight: 1 }}>{offer.mengde}</span>}
            {offer.forpris && <span style={{ fontSize: "5vmin", color: "#9aa0a6", textDecoration: "line-through", fontWeight: 700, lineHeight: 1 }}>{offer.forpris}</span>}
            {offer.rabatt ? (
              <span style={{ fontSize: "22vmin", fontWeight: 900, color: RED, lineHeight: 0.85, letterSpacing: "-0.8vmin" }}>{offer.rabatt}</span>
            ) : offer.pris ? (
              <PriceTag offer={offer} />
            ) : null}
            {fine.length > 0 && <span style={{ fontSize: "3.4vmin", color: MUTED, fontWeight: 600, marginTop: "0.5vmin" }}>{fine.join("  ·  ")}</span>}
          </div>
        </div>

        {/* Right: big product image, fills the column */}
        {img && (
          <div style={{ flex: "1 1 auto", minWidth: 0, backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
        )}
      </div>

      <BrandFooter chain={chain} />
    </div>
  )
}
