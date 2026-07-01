"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { logAudit } from "@/lib/admin/audit"

export type ScreenCommand = "power_on" | "power_off" | "reload" | "reboot"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function sendCommand(screenId: string, command: ScreenCommand) {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("screens")
    .update({ pending_command: command })
    .eq("id", screenId)
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
  const { supabase, userId } = await requireUser()
  const token = "gr_" + randomBytes(24).toString("hex")
  const { error } = await supabase
    .from("screens")
    .update({ token })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "screen.token", entityType: "screen", entityId: screenId, summary: "Genererte ny skjerm-token" })
  revalidatePath("/admin/settings")
  return { ok: true, token }
}

export async function deleteScreen(screenId: string) {
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from("screens").delete().eq("id", screenId)
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
  const { supabase, userId } = await requireUser()
  const { error } = await supabase
    .from("chains")
    .update({ color, brand_light: brandLight, brand_fg: brandFg })
    .eq("id", chainId)
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
  const { supabase, userId } = await requireUser()

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
  const { error } = await supabase.from("chains").update({ logo_url: pub.publicUrl }).eq("id", chainId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "settings.logo", entityType: "chain", entityId: chainId, summary: "Lastet opp ny kjede-logo" })
  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { ok: true, url: pub.publicUrl }
}

/**
 * Lagrer tenant-terminologi (enhetsbetegnelse) for den AKTIVE tenanten. En
 * bilforhandler setter «Forhandler/Forhandlere» i stedet for «Butikk/Butikker»,
 * og hele admin-UI-et følger dette via useTenantConfig. Kun tenant-admin
 * (chain_manager) eller super_admin som opptrer som en tenant kan endre.
 * tenants-tabellen bruker service-role (samme som getTenantConfig-lesingen).
 */
export async function saveTenantTerminology(
  unitLabel: string,
  unitLabelPlural: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Ikke innlogget" }
  if (ctx.role !== "super_admin" && ctx.role !== "chain_manager") return { ok: false, error: "Ikke tillatt" }
  const tenantId = ctx.effectiveTenantId
  if (!tenantId) return { ok: false, error: "Ingen aktiv organisasjon" }

  const admin = createAdminClient()
  const { error } = await (admin.from("tenants") as unknown as {
    update: (v: Record<string, string>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  })
    .update({ unit_label: unitLabel.trim() || "Butikk", unit_label_plural: unitLabelPlural.trim() || "Butikker" })
    .eq("id", tenantId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId: ctx.userId, action: "settings.terminology", entityType: "tenant", entityId: tenantId, summary: `Satte enhetsbetegnelse: ${unitLabel} / ${unitLabelPlural}` })
  // Layouten laster tenant-config → revalider hele admin-treet så sidebar m.m. oppdateres.
  revalidatePath("/admin", "layout")
  return { ok: true }
}
