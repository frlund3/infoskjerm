import type { WeekKpi } from "./kpi"

/**
 * Rene, klient-trygge KPI-formaterere. Bor separat fra kpi.ts fordi den modulen
 * drar inn Supabase-serverklienten — disse må kunne brukes i «use client»-widgets
 * (portrett/landskap-visning) uten å trekke server-kode inn i nettleser-bundelen.
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

export function ratio(num: number | null | undefined, den: number | null | undefined): number | null {
  if (!num || !den) return null
  return (num / den) * 100
}

export function diffPct(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || !b) return null
  return ((a - b) / Math.abs(b)) * 100
}

export function sum(weeks: WeekKpi[], key: keyof WeekKpi): number {
  return weeks.reduce((acc, w) => acc + (typeof w[key] === "number" ? (w[key] as number) : 0), 0)
}
