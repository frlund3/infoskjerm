"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"

// Rollene som har tilgang til /admin/settings-sidebaren. super_admin bypasser RLS,
// så .eq("tenant_id", tenantId) på id-baserte muteringer er selve tenant-isolasjonen
// under act-as. tenantId = effektiv (aktiv) tenant fra requireRole.
const SETTINGS_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export type ScreenCommand = "power_on" | "power_off" | "reload" | "reboot"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function sendCommand(screenId: string, command: ScreenCommand) {
  const { supabase, tenantId } = await requireRole([...SETTINGS_ROLES])
  const { error } = await supabase
    .from("screens")
    .update({ pending_command: command })
    .eq("id", screenId)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true }
}

export async function createScreen(storeId: string, name: string) {
  const { supabase, userId } = await requireUser()

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
  await logAudit({ userId, action: "screen.create", entityType: "screen", summary: `Opprettet skjerm «${name.trim() || "Ny skjerm"}»`, metadata: { storeId } })
  revalidatePath("/admin/settings")
  return { ok: true, token }
}

export async function regenerateToken(screenId: string) {
  const { supabase, userId, tenantId } = await requireRole([...SETTINGS_ROLES])
  const token = "gr_" + randomBytes(24).toString("hex")
  const { error } = await supabase
    .from("screens")
    .update({ token })
    .eq("id", screenId)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "screen.token", entityType: "screen", entityId: screenId, summary: "Genererte ny skjerm-token" })
  revalidatePath("/admin/settings")
  return { ok: true, token }
}

export async function deleteScreen(screenId: string) {
  const { supabase, userId, tenantId } = await requireRole([...SETTINGS_ROLES])
  const { error } = await supabase.from("screens").delete().eq("id", screenId).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "screen.delete", entityType: "screen", entityId: screenId, summary: "Slettet skjerm" })
  revalidatePath("/admin/settings")
  return { ok: true }
}

export async function updateChainBranding(
  chainId: string,
  color: string,
  brandLight: string,
  brandFg: string
) {
  const { supabase, userId, tenantId } = await requireRole([...SETTINGS_ROLES])
  const { error } = await supabase
    .from("chains")
    .update({ color, brand_light: brandLight, brand_fg: brandFg })
    .eq("id", chainId)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "settings.branding", entityType: "chain", entityId: chainId, summary: "Oppdaterte kjede-farger", metadata: { color, brandLight, brandFg } })
  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { ok: true }
}

const LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])

/**
 * Uploads a chain logo to the public 'media' bucket and stores its URL on the
 * chain. The logo is shown on the offer card on customer screens for every
 * store in that chain (EUROSPAR logo for EUROSPAR stores, etc.).
 */
export async function uploadChainLogo(
  chainId: string,
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, userId, tenantId } = await requireRole([...SETTINGS_ROLES])

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Ingen fil valgt" }
  if (!LOGO_MIME.has(file.type)) return { ok: false, error: "Bruk PNG, JPG, WEBP eller SVG" }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Maks 5 MB" }

  const ext = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop() || "png").toLowerCase()
  const path = `chain-logos/${chainId}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" })
  if (upErr) return { ok: false, error: upErr.message }

  const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
  const { error } = await supabase.from("chains").update({ logo_url: pub.publicUrl }).eq("id", chainId).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "settings.logo", entityType: "chain", entityId: chainId, summary: "Lastet opp ny kjede-logo" })
  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { ok: true, url: pub.publicUrl }
}
