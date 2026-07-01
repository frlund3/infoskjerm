import type { LiveItem, Block } from "@/lib/content/live"
import { SPACE, RADIUS, SHADOW, pad, typeScale, KEYFRAMES, type TypeScale } from "./tokens"

/**
 * Premium konkurranse-kort — brukt på BÅDE intern (liggende) og kunde (stående)
 * skjermer. Vibrant gradient, flytende konfetti, skjevstilt «Konkurranse»-merke,
 * lys-sveip og en pulserende CTA. Viser QR når konkurransen har delta-lenke.
 * Respekterer egendefinert bg/tekst-farge. Konsistent skala/dybde via tokens.
 */

const ACCENT = "#9d174d"

function Blocks({ blocks, color, t }: { blocks: Block[]; color: string; t: TypeScale }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} style={{ fontSize: t.h3, fontWeight: 800, margin: `${SPACE.md}px 0 ${SPACE.xs}px`, color }}>{b.text}</p>
        if (b.kind === "li") return (
          <div key={i} style={{ display: "flex", gap: SPACE.sm, fontSize: t.body, lineHeight: 1.34, color, opacity: 0.96, margin: `${SPACE.xs}px 0` }}>
            <span style={{ opacity: 0.7 }}>•</span><span>{b.text}</span>
          </div>
        )
        return <p key={i} style={{ fontSize: t.body, lineHeight: 1.4, color, opacity: 0.96, margin: `${SPACE.sm}px 0` }}>{b.text}</p>
      })}
    </div>
  )
}

export function CompetitionCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const fg = item.textColor ?? "#fff"
  const hasImg = !!item.imageUrl
  const t = typeScale(portrait)
  const P = pad(portrait)
  const titleSize = portrait ? (hasImg ? t.h1 : t.hero) : (hasImg ? t.h2 : t.h1)

  const badge = (
    <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: SPACE.sm, background: "#fff", color: ACCENT, fontWeight: 900, fontSize: t.label, letterSpacing: 3, padding: `${SPACE.xs + 2}px ${SPACE.md}px`, borderRadius: RADIUS.md, transform: "rotate(-3deg)", boxShadow: SHADOW.soft, textTransform: "uppercase" }}>
      <span style={{ fontSize: t.h3 }}>🏆</span> Konkurranse
    </div>
  )
  const cta = (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, flexWrap: "wrap" }}>
      <div style={{ background: "#fff", color: ACCENT, fontWeight: 900, fontSize: t.h3, padding: `${SPACE.sm}px ${SPACE.xl}px`, borderRadius: RADIUS.pill, animation: "wPulse 2s ease-in-out infinite", boxShadow: SHADOW.float }}>{qrUrl ? "Skann og delta!" : "Bli med og vinn!"}</div>
      {qrUrl && (
        <div style={{ background: "#fff", padding: SPACE.sm, borderRadius: RADIUS.md, boxShadow: SHADOW.float }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR-kode for å delta" width={portrait ? 176 : 132} height={portrait ? 176 : 132} style={{ display: "block" }} />
        </div>
      )}
    </div>
  )
  const title = (
    <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0, animation: "wRise .7s cubic-bezier(.16,1,.3,1) both" }}>
      <div style={{ fontSize: portrait ? t.hero : t.h1, lineHeight: 1, animation: "wFloat 4s ease-in-out infinite" }}>🎉</div>
      <h1 style={{ fontSize: titleSize, fontWeight: 900, margin: `${SPACE.sm}px 0 0`, lineHeight: 1.02, letterSpacing: -2, textShadow: "0 6px 30px rgba(0,0,0,.25)", textWrap: "balance" }}>{item.title}</h1>
      {item.blocks.length > 0 && <div style={{ marginTop: SPACE.lg, maxHeight: portrait ? 360 : 440, overflow: "hidden" }}><Blocks blocks={item.blocks} color={fg} t={t} /></div>}
    </div>
  )
  const image = hasImg && (
    <div style={{ borderRadius: RADIUS.xl, overflow: "hidden", boxShadow: SHADOW.float, background: "rgba(255,255,255,.1)", ...(portrait ? { flex: "0 0 42%", width: "100%" } : { flex: "0 0 40%", minWidth: 0 }) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: fg, background: item.bgColor ?? "linear-gradient(135deg,#4c1d95 0%,#9d174d 48%,#b45309 100%)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: "absolute", top: -140, right: -100, width: 460, height: 460, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
      <div style={{ position: "absolute", bottom: -180, left: -120, width: 560, height: 560, borderRadius: "50%", background: "rgba(0,0,0,.12)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 240, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)", animation: "wShine 7s linear infinite", pointerEvents: "none" }} />
      {/* Floating sparkles for extra life. */}
      {([["12%", "18%", 0], ["78%", "26%", 1.1], ["32%", "72%", 2], ["88%", "64%", 0.6], ["60%", "12%", 1.6]] as const).map(([left, top, d], i) => (
        <span key={i} style={{ position: "absolute", left, top, fontSize: 46, opacity: 0.85, animation: `wFloat ${4 + (i % 3)}s ease-in-out ${d}s infinite`, pointerEvents: "none" }}>{i % 2 ? "✨" : "🎊"}</span>
      ))}
      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: P, display: "flex", flexDirection: "column", gap: SPACE.lg, boxSizing: "border-box" }}>
          {badge}
          {title}
          {image}
          {cta}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: P, display: "flex", gap: SPACE.xl, alignItems: "stretch", boxSizing: "border-box" }}>
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
