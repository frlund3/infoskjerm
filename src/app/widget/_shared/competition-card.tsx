import type { LiveItem, Block } from "@/lib/content/live"

/**
 * Loud, eye-catching competition card — used on BOTH internal (landscape) and
 * customer (portrait) screens. Vibrant gradient, floating confetti, tilted
 * "KONKURRANSE" badge, moving shine and a pulsing CTA. Shows a QR code when the
 * competition has a participation link. Honors a custom bg/text colour.
 */

const RED = "#9d174d"

function Blocks({ blocks, color }: { blocks: Block[]; color: string }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} style={{ fontSize: 40, fontWeight: 800, margin: "14px 0 4px", color }}>{b.text}</p>
        if (b.kind === "li") return (
          <div key={i} style={{ display: "flex", gap: 12, fontSize: 36, lineHeight: 1.35, color, opacity: 0.95, margin: "5px 0" }}>
            <span>•</span><span>{b.text}</span>
          </div>
        )
        return <p key={i} style={{ fontSize: 36, lineHeight: 1.4, color, opacity: 0.95, margin: "8px 0" }}>{b.text}</p>
      })}
    </div>
  )
}

export function CompetitionCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const fg = item.textColor ?? "#fff"
  const hasImg = !!item.imageUrl
  const pad = portrait ? 64 : 74

  const badge = (
    <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 14, background: "#fff", color: RED, fontWeight: 900, fontSize: portrait ? 32 : 28, letterSpacing: 3, padding: "12px 28px", borderRadius: 14, transform: "rotate(-3deg)", boxShadow: "0 12px 40px rgba(0,0,0,.3)", textTransform: "uppercase" }}>
      <span style={{ fontSize: portrait ? 42 : 36 }}>🏆</span> Konkurranse
    </div>
  )
  const cta = (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      <div style={{ background: "#fff", color: RED, fontWeight: 900, fontSize: portrait ? 38 : 32, padding: "16px 44px", borderRadius: 9999, animation: "grcPulse 2s ease-in-out infinite", boxShadow: "0 14px 44px rgba(0,0,0,.3)" }}>{qrUrl ? "Skann og delta!" : "Bli med og vinn!"}</div>
      {qrUrl && (
        <div style={{ background: "#fff", padding: 14, borderRadius: 18, boxShadow: "0 14px 44px rgba(0,0,0,.3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR-kode for å delta" width={portrait ? 170 : 130} height={portrait ? 170 : 130} style={{ display: "block" }} />
        </div>
      )}
    </div>
  )
  const title = (
    <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
      <div style={{ fontSize: portrait ? 130 : (hasImg ? 84 : 110), lineHeight: 1, animation: "grcFloat 4s ease-in-out infinite" }}>🎉</div>
      <h1 style={{ fontSize: portrait ? 100 : (hasImg ? 76 : 98), fontWeight: 900, margin: "14px 0 0", lineHeight: 1.0, letterSpacing: -2, textShadow: "0 6px 30px rgba(0,0,0,.25)" }}>{item.title}</h1>
      {item.blocks.length > 0 && <div style={{ marginTop: 22, maxHeight: portrait ? 360 : 440, overflow: "hidden" }}><Blocks blocks={item.blocks} color={fg} /></div>}
    </div>
  )
  const image = hasImg && (
    <div style={{ borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.35)", background: "rgba(255,255,255,.1)", ...(portrait ? { flex: "0 0 42%", width: "100%" } : { flex: "0 0 40%", minWidth: 0 }) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: fg, background: item.bgColor ?? "linear-gradient(135deg,#4c1d95 0%,#9d174d 48%,#b45309 100%)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`@keyframes grcShine{0%{transform:translateX(-40%) skewX(-12deg)}100%{transform:translateX(180%) skewX(-12deg)}}@keyframes grcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}@keyframes grcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      <div style={{ position: "absolute", top: -140, right: -100, width: 460, height: 460, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
      <div style={{ position: "absolute", bottom: -180, left: -120, width: 560, height: 560, borderRadius: "50%", background: "rgba(0,0,0,.12)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 240, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)", animation: "grcShine 7s linear infinite" }} />
      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 34, boxSizing: "border-box" }}>
          {badge}
          {title}
          {image}
          {cta}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", gap: 54, alignItems: "stretch", boxSizing: "border-box" }}>
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
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
