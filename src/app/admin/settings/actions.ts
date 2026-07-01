"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"

/** Stabil nøkkel fra label (æøå→ae/oe/aa, resten kebab-case). */
function slugify(label: string): string {
  return label.trim().toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "avdeling"
}

/**
 * Lagrer avdelinger for KUNDE- eller INTERN-skjermer for den aktive tenanten.
 * «felles» (Hele enheten) er implisitt og lagres aldri — den injiseres med label
 * fra terminologi ved lasting (getTenantConfig). Kun ledelse.
 */
export async function saveAvdelinger(
  flate: "kunde" | "intern",
  items: { key?: string; label: string }[]
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Ikke innlogget" }
  if (ctx.role !== "super_admin" && ctx.role !== "chain_manager") return { ok: false, error: "Ikke tillatt" }
  const tenantId = ctx.effectiveTenantId
  if (!tenantId) return { ok: false, error: "Ingen aktiv organisasjon" }

  // Fjern «felles» + tomme, generer stabile nøkler, avvis duplikater.
  const seen = new Set<string>()
  const clean: { key: string; label: string }[] = []
  for (const it of items) {
    const label = (it.label || "").trim()
    if (!label) continue
    const key = (it.key?.trim() || slugify(label))
    if (key === "felles" || seen.has(key)) continue
    seen.add(key)
    clean.push({ key, label })
  }

  const column = flate === "intern" ? "avdelinger_intern" : "avdelinger"
  const admin = createAdminClient()
  const { error } = await (admin.from("tenants") as unknown as {
    update: (v: Record<string, unknown>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  })
    .update({ [column]: clean })
    .eq("id", tenantId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId: ctx.userId, action: "settings.avdelinger", entityType: "tenant", entityId: tenantId, summary: `Oppdaterte ${flate}-avdelinger (${clean.length})`, metadata: { flate, count: clean.length } })
  revalidatePath("/admin", "layout")
  return { ok: true }
}

// Destruktive skjerm-/branding-operasjoner er kun for ledelse (super_admin,
// chain_manager) — ikke area/store-roller. super_admin bypasser RLS, så
// .eq("tenant_id", tenantId) på id-baserte muteringer er selve tenant-isolasjonen
// under act-as. tenantId = effektiv (aktiv) tenant fra requireRole.
const MANAGEMENT_ROLES = ["super_admin", "chain_manager"] as const

export type ScreenCommand = "power_on" | "power_off" | "reload" | "reboot"

export async function sendCommand(screenId: string, command: ScreenCommand) {
  const { supabase, tenantId } = await requireRole([...MANAGEMENT_ROLES])
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
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])

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
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])
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
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])
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
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])
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
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])

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

/**
 * Laster opp organisasjons-logo (tenant-nivå) til media-bøtta og lagrer URL-en på
 * tenants.logo_url. Vises i sidebar-header + tenant-velger. Separat fra per-kjede
 * logo. Service-role (samme mønster som terminologi), kun tenant-admin/super_admin.
 */
export async function uploadTenantLogo(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "Ikke innlogget" }
  if (ctx.role !== "super_admin" && ctx.role !== "chain_manager") return { ok: false, error: "Ikke tillatt" }
  const tenantId = ctx.effectiveTenantId
  if (!tenantId) return { ok: false, error: "Ingen aktiv organisasjon" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Ingen fil valgt" }
  if (!LOGO_MIME.has(file.type)) return { ok: false, error: "Bruk PNG, JPG, WEBP eller SVG" }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Maks 5 MB" }

  const admin = createAdminClient()
  const ext = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop() || "png").toLowerCase()
  const path = `tenant-logos/${tenantId}-${Date.now()}.${ext}`
  const { error: upErr } = await admin.storage.from("media").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" })
  if (upErr) return { ok: false, error: upErr.message }
  const { data: pub } = admin.storage.from("media").getPublicUrl(path)
  const { error } = await (admin.from("tenants") as unknown as {
    update: (v: Record<string, string>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  }).update({ logo_url: pub.publicUrl }).eq("id", tenantId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId: ctx.userId, action: "settings.tenant_logo", entityType: "tenant", entityId: tenantId, summary: "Lastet opp organisasjons-logo" })
  revalidatePath("/admin", "layout")
  return { ok: true, url: pub.publicUrl }
}
