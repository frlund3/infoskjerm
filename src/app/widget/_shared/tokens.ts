/**
 * Felles premium design-tokens for skjerm-malene. Widgetene rendres i FAST
 * design-oppløsning (portrett 1080×1920, liggende 1920×1080 — se ScaledScreen),
 * så alle mål er i px. Én delt skala gir konsistent rytme, hierarki og dybde på
 * tvers av ALLE innholdstyper og begge orienteringer.
 */

/** 8-punkts spacing-rytme (px). */
export const SPACE = { xs: 10, sm: 18, md: 30, lg: 48, xl: 72, xxl: 108 } as const

/** Hjørne-radius. */
export const RADIUS = { md: 22, lg: 36, xl: 54, pill: 9999 } as const

/** Lagvis dybde — konsistente skygger overalt. */
export const SHADOW = {
  soft: "0 10px 30px rgba(0,0,0,.14)",
  card: "0 26px 72px rgba(0,0,0,.30)",
  float: "0 22px 64px rgba(0,0,0,.40)",
} as const

/** Ytre padding på et fullskjerm-kort. */
export const pad = (portrait: boolean): number => (portrait ? 76 : 88)

export interface TypeScale {
  hero: number
  h1: number
  h2: number
  h3: number
  body: number
  label: number
  tiny: number
}

/**
 * Typografisk skala. Liggende er litt mindre enn stående fordi linjene er bredere
 * (16:9 mot 9:16) — holder lesbarhet og luft konsistent på begge orienteringer.
 */
export function typeScale(portrait: boolean): TypeScale {
  return portrait
    ? { hero: 128, h1: 98, h2: 66, h3: 46, body: 38, label: 28, tiny: 22 }
    : { hero: 104, h1: 78, h2: 54, h3: 40, body: 32, label: 24, tiny: 20 }
}

/** Delte keyframes — samme bevegelses-språk i alle kort. Legg inn én gang per kort. */
export const KEYFRAMES = `@keyframes wFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@keyframes wPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes wShine{0%{transform:translateX(-45%) skewX(-12deg)}100%{transform:translateX(185%) skewX(-12deg)}}@keyframes wRise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}`

/** Standard «reveal»-animasjon for et korts hovedinnhold. */
export const RISE = "wRise .7s cubic-bezier(.16,1,.3,1) both"

/** Diskré lys-sveip-lag (legg som absolutt posisjonert div i et kort). */
export const shineLayer = {
  position: "absolute" as const,
  top: 0,
  bottom: 0,
  left: 0,
  width: 260,
  background: "linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)",
  animation: "wShine 7s linear infinite",
  pointerEvents: "none" as const,
}
