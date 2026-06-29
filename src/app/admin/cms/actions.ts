"use server"

import { requireRole } from "@/lib/admin/require-role"
import { collectNow, requestScreenshot } from "@/lib/xibo/client"

/**
 * Screen-operations server actions for /admin/cms. They drive the hidden Xibo
 * engine on the user's behalf (push updates, request a fresh screenshot) so the
 * CMS user never logs into Xibo. Read access is gated to management roles.
 */

const OPS_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

type ActionResult = { ok: true } | { ok: false; error: string }

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Ukjent feil mot skjermsystemet"
}

/** Force a store's players to fetch the latest content immediately. */
export async function pushToScreen(displayGroupId: number): Promise<ActionResult> {
  await requireRole([...OPS_ROLES])
  if (!Number.isInteger(displayGroupId) || displayGroupId <= 0) {
    return { ok: false, error: "Ugyldig skjermgruppe" }
  }
  try {
    await collectNow(displayGroupId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: message(err) }
  }
}

/** Ask a specific player to capture a fresh screenshot on its next collection. */
export async function requestNewScreenshot(displayId: number): Promise<ActionResult> {
  await requireRole([...OPS_ROLES])
  if (!Number.isInteger(displayId) || displayId <= 0) {
    return { ok: false, error: "Ugyldig skjerm" }
  }
  try {
    await requestScreenshot(displayId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: message(err) }
  }
}
