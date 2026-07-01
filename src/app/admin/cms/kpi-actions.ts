"use server"

import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { syncKpiFromDrift, type SyncKpiResult } from "@/lib/content/sync-kpi"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"

const SYNC_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export type SyncKpiActionResult =
  | { ok: true; result: SyncKpiResult }
  | { ok: false; error: string }

/**
 * Manually pull the latest week from Gange-Rolv Drift into this project's KPI
 * tables — the "Oppdater KPI nå" button. Lets staff refresh the screens right
 * after loading a new week into Drift, instead of waiting for the daily cron.
 */
export async function syncKpiNow(): Promise<SyncKpiActionResult> {
  const { userId, supabase, tenantId } = await requireRole([...SYNC_ROLES])

  // Kun tenants med KPI/drift-synk (Gange-Rolv) — app-lag-scoping, ikke bare skjult
  // knapp. Andre tenants (f.eks. Mobile) skal aldri kunne trigge Drift-synk.
  const { features } = await getTenantConfig(supabase, tenantId)
  if (!hasFeature(features, "kpi")) {
    return { ok: false, error: "KPI-synk er ikke aktivert for denne kjeden." }
  }

  try {
    const result = await syncKpiFromDrift()
    await logAudit({
      userId,
      action: "kpi.sync",
      summary: `Oppdaterte KPI manuelt: ${result.kpiWeeks} ukerader, ${result.svinnStores} butikker (${result.year})`,
      metadata: { ...result },
    })
    return { ok: true, result }
  } catch (e) {
    const message = e instanceof Error ? e.message : "ukjent feil"
    console.error("syncKpiNow feilet:", message)
    return { ok: false, error: message }
  }
}
