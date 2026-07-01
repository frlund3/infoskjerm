import type { LiveItem, Block } from "@/lib/content/live"

/**
 * Loud, eye-catching competition card — used on BOTH internal (landscape) and
 * customer (portrait) screens. Vibrant gradient, floating confetti, tilted
 * "KONKURRANSE" badge, moving shine and a pulsing CTA. Shows a QR code when the
 * competition has a participation link. Honors a custom bg/text colour.
 *
 * Two deliberate layouts, chosen by `portrait`:
 * - Portrait (9:16, kundeskjerm): vertical STACK — badge, big title/blurb,
 *   image, then the QR/CTA row. Nothing crops; the image flexes to fill.
 * - Landscape (16:9, bakrom/kampanje): horizontal SPLIT — text panel LEFT
 *   (badge, title, blurb, CTA/QR ~46cqw) and the image RIGHT filling the rest.
 *   Falls back to a full-width text column with a big centered CTA when there
 *   is no image.
 *
 * Everything is sized in container-query units (cqh/cqw/cqmin) off the card's
 * own box, so it stays crisp and correctly proportioned at any resolution the
 * Pi fleet / Xibo throws at it.
 */

const RED = "#9d174d"

function Blocks({ blocks, color }: { blocks: Block[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6cqh" }}>
      {blocks.map((b, i) => {
        if (b.kind === "h")
          return (
            <p key={i} style={{ fontSize: "3.6cqh", fontWeight: 800, margin: "1.2cqh 0 0.2cqh", color, lineHeight: 1.15 }}>
              {b.text}
            </p>
          )
        if (b.kind === "li")
          return (
            <div key={i} style={{ display: "flex", gap: "1cqw", fontSize: "3.2cqh", lineHeight: 1.35, color, opacity: 0.95 }}>
              <span>•</span>
              <span>{b.text}</span>
            </div>
          )
        return (
          <p key={i} style={{ fontSize: "3.2cqh", lineHeight: 1.4, color, opacity: 0.95, margin: 0 }}>
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

export function CompetitionCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const fg = item.textColor ?? "#fff"
  const hasImg = !!item.imageUrl

  const badge = (
    <div
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: "1cqh",
        background: "#fff",
        color: RED,
        fontWeight: 900,
        fontSize: portrait ? "2.9cqh" : "2.6cqh",
        letterSpacing: "0.25cqh",
        padding: "1cqh 2.4cqh",
        borderRadius: "1.2cqh",
        transform: "rotate(-3deg)",
        boxShadow: "0 1cqh 3.4cqh rgba(0,0,0,.3)",
        textTransform: "uppercase",
      }}
    >
      <span style={{ fontSize: portrait ? "3.8cqh" : "3.4cqh" }}>🏆</span> Konkurranse
    </div>
  )

  const cta = (
    <div style={{ display: "flex", alignItems: "center", gap: "2.4cqh", flexWrap: "wrap" }}>
      <div
        style={{
          background: "#fff",
          color: RED,
          fontWeight: 900,
          fontSize: portrait ? "3.4cqh" : "3cqh",
          padding: "1.4cqh 3.8cqh",
          borderRadius: 9999,
          animation: "grcPulse 2s ease-in-out infinite",
          boxShadow: "0 1.2cqh 3.8cqh rgba(0,0,0,.3)",
        }}
      >
        {qrUrl ? "Skann og delta!" : "Bli med og vinn!"}
      </div>
      {qrUrl && (
        <div style={{ background: "#fff", padding: "1.2cqh", borderRadius: "1.6cqh", boxShadow: "0 1.2cqh 3.8cqh rgba(0,0,0,.3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR-kode for å delta" style={{ display: "block", width: portrait ? "16cqh" : "14cqh", height: portrait ? "16cqh" : "14cqh" }} />
        </div>
      )}
    </div>
  )

  // Title/blurb column. Font sizes track the card height and shrink a notch when
  // an image shares the space (landscape split / portrait stack), so the heading
  // never crowds the media.
  const title = (
    <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
      <div style={{ fontSize: portrait ? "11cqh" : hasImg ? "9cqh" : "12cqh", lineHeight: 1, animation: "grcFloat 4s ease-in-out infinite" }}>🎉</div>
      <h1
        style={{
          // Portrett: begrens av BREDDEN (cqmin) så lange ord som «KONKURRANSE»
          // aldri klipper; break-word som ekstra sikring.
          fontSize: portrait ? "min(8.5cqh, 13cqmin)" : hasImg ? "8cqh" : "10cqh",
          fontWeight: 900,
          margin: "1.4cqh 0 0",
          lineHeight: 1.02,
          letterSpacing: "-0.2cqh",
          textShadow: "0 0.6cqh 3cqh rgba(0,0,0,.25)",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        }}
      >
        {item.title}
      </h1>
      {item.blocks.length > 0 && (
        <div style={{ marginTop: "2cqh", maxHeight: portrait ? "30cqh" : "42cqh", overflow: "hidden" }}>
          <Blocks blocks={item.blocks} color={fg} />
        </div>
      )}
    </div>
  )

  // Portrait: image is a wide band under the title. Landscape: image is the
  // right half of the split, filling top-to-bottom.
  const image = hasImg && (
    <div
      style={{
        borderRadius: "2.4cqh",
        overflow: "hidden",
        boxShadow: "0 1.8cqh 5cqh rgba(0,0,0,.35)",
        background: "rgba(255,255,255,.1)",
        ...(portrait ? { flex: "0 0 40cqh", width: "100%" } : { flex: "0 0 46cqw", minWidth: 0 }),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  )

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        containerType: "size",
        overflow: "hidden",
        color: fg,
        background: item.bgColor ?? "linear-gradient(135deg,#4c1d95 0%,#9d174d 48%,#b45309 100%)",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`@keyframes grcShine{0%{transform:translateX(-40%) skewX(-12deg)}100%{transform:translateX(180%) skewX(-12deg)}}@keyframes grcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5cqh)}}@keyframes grcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      <div style={{ position: "absolute", top: "-14cqh", right: "-8cqh", width: "40cqh", height: "40cqh", borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
      <div style={{ position: "absolute", bottom: "-18cqh", left: "-10cqh", width: "50cqh", height: "50cqh", borderRadius: "50%", background: "rgba(0,0,0,.12)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "22cqh", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)", animation: "grcShine 7s linear infinite" }} />
      {/* Floating sparkles for extra life. */}
      {([["12%", "18%", 0], ["78%", "26%", 1.1], ["32%", "72%", 2], ["88%", "64%", 0.6], ["60%", "12%", 1.6]] as const).map(([left, top, d], i) => (
        <span key={i} style={{ position: "absolute", left, top, fontSize: "4.2cqh", opacity: 0.85, animation: `grcFloat ${4 + (i % 3)}s ease-in-out ${d}s infinite`, pointerEvents: "none" }}>
          {i % 2 ? "✨" : "🎊"}
        </span>
      ))}
      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: "6cqh 5.5cqw", display: "flex", flexDirection: "column", gap: "3cqh", boxSizing: "border-box" }}>
          {badge}
          {title}
          {image}
          {cta}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: "8cqh 4.5cqw", display: "flex", gap: "3.4cqw", alignItems: "stretch", boxSizing: "border-box" }}>
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "2.4cqh" }}>
            {badge}
            {title}
            {cta}
          </div>
          {image}
        </div>
      )}
    </div>
  )
}
