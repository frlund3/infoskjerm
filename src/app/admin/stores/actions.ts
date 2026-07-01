"use server"

import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/admin/audit"
import { requireRole } from "@/lib/admin/require-role"
import { hashKioskPassword } from "@/lib/kiosk/auth"

const STORE_ROLES = ["super_admin", "chain_manager", "area_manager"] as const

/**
 * Setter (eller fjerner, ved tomt passord) kiosk-passordet for en enhet.
 * RLS på stores sikrer at brukeren kun kan endre egne enheter. Passordet
 * hashes server-side; klartekst lagres aldri.
 */
export async function setKioskPassword(
  storeId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, tenantId } = await requireRole([...STORE_ROLES])
  const trimmed = password.trim()
  const hash = trimmed ? hashKioskPassword(trimmed) : null
  // store_tags-mønster: verifiser at enheten tilhører aktiv tenant før id-only update.
  const { data: owned } = await supabase.from("stores").select("id").eq("id", storeId).eq("tenant_id", tenantId).maybeSingle()
  if (!owned) return { ok: false, error: "Ikke funnet" }
  // Ny kolonne (031) er ikke i den genererte Database-typen ennå → cast.
  const { error } = await (supabase.from("stores") as unknown as {
    update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> }
  })
    .update({ kiosk_password_hash: hash })
    .eq("id", storeId)
  if (error) return { ok: false, error: error.message }
  await logAudit({
    userId,
    action: "store.kiosk_password",
    entityType: "store",
    entityId: storeId,
    summary: trimmed ? "Satte kiosk-passord" : "Fjernet kiosk-passord",
  })
  revalidatePath(`/admin/stores/${storeId}`)
  return { ok: true }
}

export async function updateStoreKundeklubb(
  storeId: string,
  settings: { enabled: boolean; url: string; headline: string; subtext: string; cta: string }
) {
  const { supabase, userId, tenantId } = await requireRole([...STORE_ROLES])
  const { error } = await supabase
    .from("stores")
    .update({
      kundeklubb_enabled: settings.enabled,
      kundeklubb_url: settings.url.trim() || null,
      kundeklubb_headline: settings.headline.trim() || null,
      kundeklubb_subtext: settings.subtext.trim() || null,
      kundeklubb_cta: settings.cta.trim() || null,
    })
    .eq("id", storeId)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.kundeklubb", entityType: "store", entityId: storeId, summary: `Oppdaterte kundeklubb (${settings.enabled ? "på" : "av"})` })
  revalidatePath(`/admin/stores/${storeId}`)
  return { ok: true }
}

export async function deleteStore(storeId: string) {
  const { supabase, userId, tenantId } = await requireRole([...STORE_ROLES])
  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).eq("tenant_id", tenantId).maybeSingle()
  const { error } = await supabase.from("stores").delete().eq("id", storeId).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.delete", entityType: "store", entityId: storeId, summary: `Slettet butikk «${store?.name ?? storeId}»` })
  revalidatePath("/admin/stores")
  return { ok: true }
}

export async function toggleStoreTag(storeId: string, tagId: string, assign: boolean) {
  const { supabase, tenantId } = await requireRole([...STORE_ROLES])
  // store_tags er en join-tabell uten tenant_id — verifiser at butikken tilhører aktiv tenant først.
  const { data: st } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("tenant_id", tenantId)
    .maybeSingle()
  if (!st) return { ok: false, error: "Ikke funnet" }
  if (assign) {
    const { error } = await supabase
      .from("store_tags")
      .upsert({ store_id: storeId, tag_id: tagId })
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from("store_tags")
      .delete()
      .eq("store_id", storeId)
      .eq("tag_id", tagId)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath("/admin/stores")
  return { ok: true }
}

interface CreatedTag {
  id: string
  name: string
  color: string
}

type CreateTagResult =
  | { ok: true; tag: CreatedTag }
  | { ok: false; error: string }

export async function createTag(name: string, color: string): Promise<CreateTagResult> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Tag-navn kan ikke være tomt" }

  const { supabase, userId, tenantId } = await requireRole([...STORE_ROLES])

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, color, tenant_id: tenantId })
    .select("id, name, color")
    .single()

  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "tag.create", entityType: "tag", entityId: data.id, summary: `Opprettet tagg «${trimmed}»` })
  revalidatePath("/admin/stores")
  return { ok: true, tag: data }
}

export async function createStore(data: {
  name: string
  company_name: string
  org_number: string
  gln: string
  email: string
  city: string
  chain_id: string
}) {
  const { supabase, userId, tenantId } = await requireRole([...STORE_ROLES])

  const { error } = await supabase.from("stores").insert({
    ...data,
    tenant_id: tenantId,
  })

  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.create", entityType: "store", summary: `Opprettet butikk «${data.name}»`, metadata: { chain_id: data.chain_id, city: data.city } })
  revalidatePath("/admin/stores")
  return { ok: true }
}
