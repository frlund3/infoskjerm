/**
 * Rene, klient-trygge KPI-formattere (ingen server-avhengigheter). Ligger separat
 * fra kpi.ts (som importerer next/headers via supabase/server) så klient-widgets
 * kan formatere tall uten å dra inn server-only kode i klient-bundelen.
 */

export function kr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–"
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mill`
  return value.toLocaleString("nb-NO", { maximumFractionDigits: 0 })
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–"
  return `${value.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`
}

/** Prosentvis differanse av a vs b ((a-b)/|b| * 100). */
export function diffPct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || !b) return null
  return ((a - b) / Math.abs(b)) * 100
}
