"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"

const MANAGEMENT_ROLES = ["super_admin", "chain_manager", "area_manager"] as const

export type Flate = "kunde" | "intern"
export type Orientation = "portrait" | "landscape"

/**
 * Setter hva en fysisk skjerm (screens-rad, token) skal vise: flate + avdeling +
 * orientering. /skjerm/<token> rendrer deretter — Pi-en rører vi aldri. RLS på
 * screens er tenant-scopet; area/store-roller begrenses av RLS til egne enheter.
 */
export async function setScreenAssignment(
  screenId: string,
  assignment: { flate: Flate; avdeling: string; orientation: Orientation }
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const flate: Flate = assignment.flate === "intern" ? "intern" : "kunde"
  const orientation: Orientation = assignment.orientation === "landscape" ? "landscape" : "portrait"
  const avdeling = (assignment.avdeling || "felles").trim() || "felles"

  // Nye kolonner (037) er ikke i den genererte Database-typen ennå → cast.
  const { error } = await (supabase.from("screens") as unknown as {
    update: (v: Record<string, string>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  })
    .update({ flate, avdeling, orientation })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.assignment", entityType: "screen", entityId: screenId, summary: `Satte skjerm: ${flate} / ${avdeling} / ${orientation}`, metadata: { flate, avdeling, orientation } })
  revalidatePath("/admin/stores", "layout")
  return { ok: true }
}
