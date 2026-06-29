import type { LiveItem, OfferFields } from "@/lib/content/live"

/**
 * A structured retail offer rendered as a bold price card (SPAR/EUROSPAR style):
 * badge, product image, name, big price or discount, before-price, multi-buy and
 * the fine print. Sized in `vmin` so it scales cleanly on both portrait customer
 * screens and landscape previews. White card with red price + green brand bar.
 */

const RED = "#e4002b"
const GREEN = "#16a34a"
const INK = "#0a0a0a"

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

function DiscountBubble({ rabatt }: { rabatt: string }) {
  return (
    <div style={{ flex: "0 0 auto", background: RED, color: "#fff", borderRadius: "50%", width: "30vmin", height: "30vmin", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 1vmin 4vmin rgba(0,0,0,.18)" }}>
      <span style={{ fontSize: "11vmin", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.3vmin" }}>{rabatt}</span>
    </div>
  )
}

function PriceTag({ offer }: { offer: OfferFields }) {
  // Norwegian price split: kroner big, øre small raised.
  const [kr, ore] = (offer.pris ?? "").split(/[.,]/)
  return (
    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {offer.forpris && <span style={{ fontSize: "5vmin", color: "#9aa0a6", textDecoration: "line-through", fontWeight: 700, lineHeight: 1 }}>{offer.forpris}</span>}
      <div style={{ display: "flex", alignItems: "flex-start", color: RED, lineHeight: 0.85 }}>
        <span style={{ fontSize: "22vmin", fontWeight: 900, letterSpacing: "-0.6vmin" }}>{kr}</span>
        {ore && <span style={{ fontSize: "9vmin", fontWeight: 900, marginTop: "1.5vmin" }}>{ore}</span>}
      </div>
    </div>
  )
}

export function OfferCard({ item }: { item: LiveItem }) {
  const offer = item.offer
  if (!offer) return null
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.enhetspris, offer.maks, offer.pant ? "+ pant" : null].filter(Boolean) as string[]

  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", flexDirection: "column", padding: "6vmin 6vmin 0", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Badge + period */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "3vmin", flexWrap: "wrap" }}>
        {offer.badge && (
          <span style={{ background: RED, color: "#fff", fontWeight: 900, fontSize: "5.5vmin", letterSpacing: "0.4vmin", padding: "1.6vmin 4vmin", borderRadius: "100vmin", textTransform: "uppercase" }}>{offer.badge}</span>
        )}
        {period && <span style={{ marginLeft: "auto", background: GREEN, color: "#fff", fontWeight: 800, fontSize: "3.4vmin", padding: "1.4vmin 3.2vmin", borderRadius: "100vmin" }}>{period}</span>}
      </div>

      {/* Product image */}
      {img && (
        <div style={{ flex: "1 1 auto", minHeight: 0, margin: "3vmin 0", backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      )}

      {/* Name + info */}
      <div style={{ flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "8.5vmin", fontWeight: 900, margin: 0, lineHeight: 1.02, letterSpacing: "-0.3vmin" }}>{offer.varenavn}</h1>
        {offer.vareinfo && <p style={{ fontSize: "4vmin", color: "#5f6368", margin: "1.5vmin 0 0" }}>{offer.vareinfo}</p>}
      </div>

      {/* Price row */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4vmin", marginTop: "3vmin" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vmin" }}>
          {offer.mengde && <span style={{ fontSize: "7vmin", fontWeight: 900, color: INK, lineHeight: 1 }}>{offer.mengde}</span>}
          {fine.length > 0 && <span style={{ fontSize: "3.4vmin", color: "#5f6368", fontWeight: 600 }}>{fine.join("  ·  ")}</span>}
        </div>
        {offer.rabatt ? <DiscountBubble rabatt={offer.rabatt} /> : offer.pris ? <PriceTag offer={offer} /> : null}
      </div>

      {/* Brand bar */}
      <div style={{ flex: "0 0 auto", marginTop: "4vmin", marginLeft: "-6vmin", marginRight: "-6vmin", background: GREEN, color: "#fff", textAlign: "center", padding: "2.5vmin", fontWeight: 900, letterSpacing: "0.5vmin", fontSize: "3.6vmin", textTransform: "uppercase" }}>
        Gange-Rolv
      </div>
    </div>
  )
}
