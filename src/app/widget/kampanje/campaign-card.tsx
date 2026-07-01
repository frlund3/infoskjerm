import type { LiveItem } from "@/lib/content/live"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"

/**
 * Premium LIGGENDE kampanjekort (1920×1080) i bilforhandler-stil:
 *   • helbilde-bakgrunn med gradient-scrim for lesbarhet
 *   • mørk kategori-fane (SOMMERTILBUD / SPØR OSS OM HJELP …)
 *   • stor overskrift + kursiv støttelinje i en farget kampanjeboble
 *   • pris i sirkel-badge (kort/prosent) eller inline
 *   • kjedelogo/-navn nede til høyre
 *
 * Alt skaleres via container-query-enheter (cqmin/cqh) → ser likt ut på enhver
 * 16:9-skjerm. Rein presentasjon; ingen rå HTML injiseres.
 */

const CAMPAIGN_ORANGE = "#ea6a1e"
const INK = "#111214"

/** True for korte prisstrenger som egner seg i sirkel-badge (prosent/rabatt). */
function isBadgePrice(price: string): boolean {
  const p = price.trim()
  return p.length <= 7 && (/%/.test(p) || /^[-–]?\s*\d/.test(p))
}

function PriceBadge({ price, accent }: { price: string; accent: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "8cqh",
        right: "7cqh",
        width: "26cqh",
        height: "26cqh",
        borderRadius: "50%",
        background: accent,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3cqh 8cqh rgba(0,0,0,.45)",
        transform: "rotate(-8deg)",
        border: "1.2cqh solid rgba(255,255,255,.9)",
      }}
    >
      <span style={{ fontSize: "9cqh", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.3cqh" }}>{price}</span>
    </div>
  )
}

export function CampaignCard({ item, chain }: { item: LiveItem; chain?: ChainBrand | null }) {
  const c = item.campaign
  if (!c) return null
  const accent = c.accent || CAMPAIGN_ORANGE
  const img = item.imageUrl
  const badge = c.price && isBadgePrice(c.price)

  return (
    <div style={{ position: "absolute", inset: 0, containerType: "size", background: INK, overflow: "hidden" }}>
      {/* Helbilde-bakgrunn med langsom ken-burns */}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "grKb 22s ease-in-out infinite alternate" }}
        />
      )}
      {/* Scrim: mørkere til venstre der teksten ligger */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(10,10,12,.86) 0%, rgba(10,10,12,.66) 34%, rgba(10,10,12,.12) 62%, rgba(10,10,12,0) 100%)" }} />

      {/* Innhold: venstrejustert kolonne */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "3cqh", padding: "0 8cqw", maxWidth: "62%" }}>
        {c.category && (
          <span
            style={{
              alignSelf: "flex-start",
              background: INK,
              color: "#fff",
              fontSize: "3.4cqh",
              fontWeight: 800,
              letterSpacing: "0.35cqh",
              textTransform: "uppercase",
              padding: "1.6cqh 3.2cqh",
              borderRadius: "1.4cqh",
              boxShadow: "0 2cqh 5cqh rgba(0,0,0,.4)",
            }}
          >
            {c.category}
          </span>
        )}

        <h1 style={{ margin: 0, color: "#fff", fontSize: "12cqh", fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.4cqh", textShadow: "0 1.5cqh 4cqh rgba(0,0,0,.45)" }}>
          {c.headline}
        </h1>

        {c.subtext && (
          <p style={{ margin: 0, color: "rgba(255,255,255,.92)", fontSize: "4.6cqh", fontStyle: "italic", fontWeight: 500, lineHeight: 1.15, maxWidth: "92%" }}>
            {c.subtext}
          </p>
        )}

        {c.price && !badge && (
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: "1cqh",
              background: accent,
              color: "#fff",
              fontSize: "6.4cqh",
              fontWeight: 900,
              letterSpacing: "-0.2cqh",
              padding: "1.8cqh 4cqh",
              borderRadius: "2cqh",
              boxShadow: "0 3cqh 7cqh rgba(0,0,0,.4)",
            }}
          >
            {c.price}
          </div>
        )}
      </div>

      {c.price && badge && <PriceBadge price={c.price} accent={accent} />}

      {/* Kjedelogo / -navn nede til høyre */}
      <div style={{ position: "absolute", right: "6cqh", bottom: "6cqh", display: "flex", alignItems: "center" }}>
        {chain?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chain.logoUrl} alt={chain.name ?? ""} style={{ height: "8cqh", maxWidth: "30cqw", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))" }} />
        ) : chain?.name ? (
          <span style={{ color: "#fff", fontSize: "5cqh", fontWeight: 900, letterSpacing: "0.2cqh", textShadow: "0 2px 6px rgba(0,0,0,.5)" }}>{chain.name}</span>
        ) : null}
      </div>
    </div>
  )
}
