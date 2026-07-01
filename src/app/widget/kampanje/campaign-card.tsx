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
 * Alt skaleres via container-query-enheter (cqmin/cqmin) → ser likt ut på enhver
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
        top: "8cqmin",
        right: "7cqmin",
        width: "26cqmin",
        height: "26cqmin",
        borderRadius: "50%",
        background: accent,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3cqmin 8cqmin rgba(0,0,0,.45)",
        transform: "rotate(-8deg)",
        border: "1.2cqmin solid rgba(255,255,255,.9)",
      }}
    >
      <span style={{ fontSize: "9cqmin", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.3cqmin" }}>{price}</span>
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
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "3cqmin", padding: "0 8cqw", maxWidth: "62%" }}>
        {c.category && (
          <span
            style={{
              alignSelf: "flex-start",
              background: INK,
              color: "#fff",
              fontSize: "3.4cqmin",
              fontWeight: 800,
              letterSpacing: "0.35cqmin",
              textTransform: "uppercase",
              padding: "1.6cqmin 3.2cqmin",
              borderRadius: "1.4cqmin",
              boxShadow: "0 2cqmin 5cqmin rgba(0,0,0,.4)",
            }}
          >
            {c.category}
          </span>
        )}

        <h1 style={{ margin: 0, color: "#fff", fontSize: "11cqmin", fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.4cqmin", textShadow: "0 1.5cqmin 4cqmin rgba(0,0,0,.45)", overflowWrap: "break-word", hyphens: "auto" }}>
          {c.headline}
        </h1>

        {c.subtext && (
          <p style={{ margin: 0, color: "rgba(255,255,255,.92)", fontSize: "4.6cqmin", fontStyle: "italic", fontWeight: 500, lineHeight: 1.15, maxWidth: "92%" }}>
            {c.subtext}
          </p>
        )}

        {c.price && !badge && (
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: "1cqmin",
              background: accent,
              color: "#fff",
              fontSize: "6.4cqmin",
              fontWeight: 900,
              letterSpacing: "-0.2cqmin",
              padding: "1.8cqmin 4cqmin",
              borderRadius: "2cqmin",
              boxShadow: "0 3cqmin 7cqmin rgba(0,0,0,.4)",
            }}
          >
            {c.price}
          </div>
        )}
      </div>

      {c.price && badge && <PriceBadge price={c.price} accent={accent} />}

      {/* Kjedelogo / -navn nede til høyre */}
      <div style={{ position: "absolute", right: "6cqmin", bottom: "6cqmin", display: "flex", alignItems: "center" }}>
        {chain?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chain.logoUrl} alt={chain.name ?? ""} style={{ height: "8cqmin", maxWidth: "30cqw", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))" }} />
        ) : chain?.name ? (
          <span style={{ color: "#fff", fontSize: "5cqmin", fontWeight: 900, letterSpacing: "0.2cqmin", textShadow: "0 2px 6px rgba(0,0,0,.5)" }}>{chain.name}</span>
        ) : null}
      </div>
    </div>
  )
}
