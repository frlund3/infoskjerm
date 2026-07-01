"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { hashKioskPassword } from "@/lib/kiosk/auth"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

/**
 * Setter (eller fjerner, ved tomt passord) kiosk-passordet for en enhet.
 * RLS på stores sikrer at brukeren kun kan endre egne enheter. Passordet
 * hashes server-side; klartekst lagres aldri.
 */
export async function setKioskPassword(
  storeId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser()
  const trimmed = password.trim()
  const hash = trimmed ? hashKioskPassword(trimmed) : null
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
  const { supabase, userId } = await requireUser()
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
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.kundeklubb", entityType: "store", entityId: storeId, summary: `Oppdaterte kundeklubb (${settings.enabled ? "på" : "av"})` })
  revalidatePath(`/admin/stores/${storeId}`)
  return { ok: true }
}

export async function deleteStore(storeId: string) {
  const { supabase, userId } = await requireUser()
  const { data: store } = await supabase.from("stores").select("name").eq("id", storeId).maybeSingle()
  const { error } = await supabase.from("stores").delete().eq("id", storeId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.delete", entityType: "store", entityId: storeId, summary: `Slettet butikk «${store?.name ?? storeId}»` })
  revalidatePath("/admin/stores")
  return { ok: true }
}

export async function toggleStoreTag(storeId: string, tagId: string, assign: boolean) {
  const { supabase } = await requireUser()
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

  const { supabase, userId } = await requireUser()

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, color, tenant_id: profile.tenant_id })
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
  const { supabase, userId } = await requireUser()

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { error } = await supabase.from("stores").insert({
    ...data,
    tenant_id: profile.tenant_id,
  })

  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "store.create", entityType: "store", summary: `Opprettet butikk «${data.name}»`, metadata: { chain_id: data.chain_id, city: data.city } })
  revalidatePath("/admin/stores")
  return { ok: true }
}
