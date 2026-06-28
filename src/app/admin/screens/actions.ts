"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"

type ScreenCommand = "reload" | "reboot" | "power_off" | "power_on" | "maintenance_on" | "maintenance_off"

export async function sendCommand(screenId: string, command: ScreenCommand) {
  const { supabase } = await requireRole(["super_admin", "chain_manager", "store_manager"])
  const { error } = await supabase
    .from("screens")
    .update({ pending_command: command })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/screens")
  return { ok: true }
}

export async function sendBulkCommand(screenIds: string[], command: ScreenCommand) {
  const { supabase } = await requireRole(["super_admin", "chain_manager", "store_manager"])
  const { error } = await supabase
    .from("screens")
    .update({ pending_command: command })
    .in("id", screenIds)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/screens")
  return { ok: true }
}

export async function setMaintenanceMode(screenId: string, enable: boolean) {
  const { supabase } = await requireRole(["super_admin", "chain_manager", "store_manager"])
  const { error } = await supabase
    .from("screens")
    .update({
      status: enable ? "maintenance" : "active",
      pending_command: enable ? "maintenance_on" : "maintenance_off",
    })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/screens")
  return { ok: true }
}
