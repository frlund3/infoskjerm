import type { LiveItem, Block } from "@/lib/content/live"

/**
 * Råflott "gallaaften"-invitasjon — brukt på interne (landscape) og evt.
 * kunde (portrait) skjermer. Dyp midnatt-til-gull gradient, svevende ballonger
 * og konfetti, skinn-effekt, stor INVITASJON-badge, dato/sted-chips og en
 * glødende QR-kode som peker til den innebygde påmeldingssiden (/pamelding/<id>).
 */

const GOLD = "#f5c451"

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(iso)
  const date = d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })
  const cap = date.charAt(0).toUpperCase() + date.slice(1)
  if (!hasTime) return cap
  const time = d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })
  return `${cap} kl. ${time}`
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
}

function Chip({ icon, text, portrait }: { icon: string; text: string; portrait: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.1)", border: "1px solid rgba(245,196,81,.45)", borderRadius: 9999, padding: portrait ? "14px 30px" : "12px 26px", fontSize: portrait ? 36 : 32, fontWeight: 700, backdropFilter: "blur(4px)" }}>
      <span style={{ fontSize: portrait ? 40 : 34 }}>{icon}</span>
      {text}
    </span>
  )
}

function Blocks({ blocks, color }: { blocks: Block[]; color: string }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.kind === "h") return <p key={i} style={{ fontSize: 38, fontWeight: 800, margin: "12px 0 4px", color }}>{b.text}</p>
        if (b.kind === "li") return (
          <div key={i} style={{ display: "flex", gap: 12, fontSize: 34, lineHeight: 1.35, color, opacity: 0.95, margin: "5px 0" }}>
            <span style={{ color: GOLD }}>•</span><span>{b.text}</span>
          </div>
        )
        return <p key={i} style={{ fontSize: 34, lineHeight: 1.4, color, opacity: 0.95, margin: "8px 0" }}>{b.text}</p>
      })}
    </div>
  )
}

export function InvitationCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const fg = item.textColor ?? "#fff"
  const hasImg = !!item.imageUrl
  const inv = item.invitation
  const pad = portrait ? 64 : 74
  const dateText = formatEventDate(inv?.eventDate ?? null)
  const deadline = formatDeadline(inv?.signupDeadline ?? null)

  const badge = (
    <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 14, background: GOLD, color: "#1a1333", fontWeight: 900, fontSize: portrait ? 32 : 28, letterSpacing: 4, padding: "12px 30px", borderRadius: 14, transform: "rotate(-2deg)", boxShadow: "0 12px 40px rgba(0,0,0,.4)", textTransform: "uppercase" }}>
      <span style={{ fontSize: portrait ? 42 : 36 }}>🎉</span> Invitasjon
    </div>
  )

  const meta = (dateText || item.invitation?.eventPlace) && (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 26 }}>
      {dateText && <Chip icon="📅" text={dateText} portrait={portrait} />}
      {item.invitation?.eventPlace && <Chip icon="📍" text={item.invitation.eventPlace} portrait={portrait} />}
    </div>
  )

  const cta = inv?.signupEnabled !== false && (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", marginTop: 30 }}>
      {qrUrl ? (
        <>
          <div style={{ background: "#fff", padding: 16, borderRadius: 20, boxShadow: "0 14px 44px rgba(0,0,0,.4)", animation: "grInvGlow 2.8s ease-in-out infinite" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR-kode for påmelding" width={portrait ? 200 : 168} height={portrait ? 200 : 168} style={{ display: "block" }} />
          </div>
          <div>
            <div style={{ fontSize: portrait ? 40 : 36, fontWeight: 900, color: GOLD }}>Skann for påmelding</div>
            {deadline && <div style={{ fontSize: portrait ? 30 : 27, opacity: 0.85, marginTop: 6 }}>Påmeldingsfrist {deadline}</div>}
          </div>
        </>
      ) : (
        <div style={{ background: GOLD, color: "#1a1333", fontWeight: 900, fontSize: portrait ? 38 : 32, padding: "16px 44px", borderRadius: 9999, boxShadow: "0 14px 44px rgba(0,0,0,.3)" }}>Du er invitert!</div>
      )}
    </div>
  )

  const title = (
    <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
      <h1 style={{ fontSize: portrait ? 104 : (hasImg ? 80 : 104), fontWeight: 900, margin: "18px 0 0", lineHeight: 1.0, letterSpacing: -2, textShadow: "0 6px 30px rgba(0,0,0,.35)" }}>{item.title}</h1>
      {meta}
      {item.blocks.length > 0 && <div style={{ marginTop: 22, maxHeight: portrait ? 320 : 360, overflow: "hidden" }}><Blocks blocks={item.blocks} color={fg} /></div>}
    </div>
  )

  const image = hasImg && (
    <div style={{ borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.45)", background: "rgba(255,255,255,.08)", ...(portrait ? { flex: "0 0 40%", width: "100%" } : { flex: "0 0 38%", minWidth: 0 }) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: fg, background: item.bgColor ?? "linear-gradient(135deg,#1a1333 0%,#3b1d63 45%,#7a2e62 100%)", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`@keyframes grInvShine{0%{transform:translateX(-40%) skewX(-12deg)}100%{transform:translateX(180%) skewX(-12deg)}}@keyframes grInvFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}@keyframes grInvGlow{0%,100%{box-shadow:0 14px 44px rgba(0,0,0,.4)}50%{box-shadow:0 14px 60px rgba(245,196,81,.65)}}`}</style>
      <div style={{ position: "absolute", top: -140, right: -100, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,196,81,.18), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -180, left: -120, width: 560, height: 560, borderRadius: "50%", background: "rgba(0,0,0,.18)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 240, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)", animation: "grInvShine 8s linear infinite" }} />
      {/* Floating balloons + confetti for festlig stemning. */}
      {([["10%", "16%", 0, "🎈"], ["80%", "22%", 1.1, "🎊"], ["30%", "74%", 2, "✨"], ["88%", "66%", 0.6, "🎈"], ["58%", "12%", 1.6, "🥂"]] as const).map(([left, top, d, e], i) => (
        <span key={i} style={{ position: "absolute", left, top, fontSize: 52, opacity: 0.85, animation: `grInvFloat ${4 + (i % 3)}s ease-in-out ${d}s infinite`, pointerEvents: "none" }}>{e}</span>
      ))}
      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 30, boxSizing: "border-box" }}>
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
