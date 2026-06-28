"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ScreenCommand = "power_on" | "power_off" | "reload" | "reboot"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return supabase
}

export async function sendCommand(screenId: string, command: ScreenCommand) {
  const supabase = await requireUser()
  const { error } = await supabase
    .from("screens")
    .update({ pending_command: command })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true }
}

export async function createScreen(storeId: string, name: string) {
  const supabase = await requireUser()

  // tenant for the chosen store (RLS keeps this within the user's tenant)
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("tenant_id")
    .eq("id", storeId)
    .single()
  if (storeErr || !store) return { ok: false, error: "Fant ikke butikk" }

  const token = "gr_" + randomBytes(24).toString("hex")
  const { error } = await supabase.from("screens").insert({
    store_id: storeId,
    tenant_id: store.tenant_id,
    name: name.trim() || "Ny skjerm",
    token,
    status: "active",
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true, token }
}

export async function regenerateToken(screenId: string) {
  const supabase = await requireUser()
  const token = "gr_" + randomBytes(24).toString("hex")
  const { error } = await supabase
    .from("screens")
    .update({ token })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true, token }
}

export async function deleteScreen(screenId: string) {
  const supabase = await requireUser()
  const { error } = await supabase.from("screens").delete().eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true }
}

export async function updateChainBranding(
  chainId: string,
  color: string,
  brandLight: string,
  brandFg: string
) {
  const supabase = await requireUser()
  const { error } = await supabase
    .from("chains")
    .update({ color, brand_light: brandLight, brand_fg: brandFg })
    .eq("id", chainId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { ok: true }
}
