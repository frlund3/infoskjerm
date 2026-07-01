"use server"

import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { revalidatePath } from "next/cache"
import { audienceForType, type Audience } from "./audience"
import type { OfferFields, CampaignFields } from "@/lib/content/live"
import type { Json } from "@/types/database"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export type ContentType = "news" | "competition" | "stats" | "weather" | "slide" | "job" | "birthday" | "ticker" | "invitation" | "gallery"

/** En vare i et galleri (rett, meny, ansattilbud). */
export interface GalleryItem {
  name: string
  /** Pris, f.eks. "149,-". */
  price: string | null
  /** Prisinfo/enhet, f.eks. "/pers", "/kg", "personalpris". */
  priceInfo: string | null
  imageUrl: string | null
}

/** Galleri (catering/meny/ansattilbud): overskrift + varer som veksler + valgfri QR. */
export interface GalleryFields {
  theme: "catering" | "meny" | "ansattilbud"
  items: GalleryItem[]
  /** Lenke QR-koden skal peke til (f.eks. bestillingsside). Tom = ingen QR. */
  qrUrl: string | null
  /** Tekst over QR-koden, f.eks. "Bestill her". */
  qrLabel: string | null
}
export type TargetMode = "all" | "stores" | "tags"

/** Invitasjon (arrangement): dato/sted + påmelding via QR-kode. */
export interface InvitationFields {
  /** ISO datetime (datetime-local) for når arrangementet starter. */
  eventDate: string | null
  /** Sted / lokale. */
  eventPlace: string | null
  /** Vis QR for påmelding på skjermen. */
  signupEnabled: boolean
  /** Påmeldingsfrist (ISO date), valgfri — vises på skjerm og landingsside. */
  signupDeadline: string | null
  /** Egen lenke QR-koden skal peke til. Tom → innebygd påmeldingsside (/pamelding/<id>). */
  signupUrl: string | null
}
export type ImageMode = "plakat" | "bakgrunn" | "liten"
export type { Audience } from "./audience"

export interface ContentInput {
  title: string
  type: ContentType
  bodyHtml: string
  imageUrl: string | null
  /** All attached images. 2+ → rendered full-page, side by side (no dimmed bg). */
  imageUrls?: string[]
  imageMode?: ImageMode
  /** Customer screens vs staff/back-room. Falls back to audienceForType. */
  audience?: Audience
  targetMode: TargetMode
  storeIds: string[]
  tagIds: string[]
  validFrom: string | null
  validTo: string | null
  publish: boolean
  /** Job ads only: contact person + application link, shown on the card. */
  contactPerson?: string | null
  applyUrl?: string | null
  /** Sales (stats) only: the KPI value + change indicator. */
  statsValue?: string | null
  statsChange?: string | null
  /** Offer (slide) only: structured price-card fields (when not a poster). */
  offer?: OfferFields | null
  /** Campaign (slide) only: landscape campaign-card fields (Mobile-style poster). */
  campaign?: CampaignFields | null
  /** Customer offers: department/category ("felles" = whole store). */
  avdeling?: string | null
  /** Text cards: optional background + text colour. */
  bgColor?: string | null
  textColor?: string | null
  /** Customer-club invite (slide): editable headline + subtext. */
  klubb?: { headline: string; subtext: string } | null
  /** Invitation only: event date/place + built-in signup config. */
  invitation?: InvitationFields | null
  /** Gallery only: theme + items (image/price/info) + optional QR. */
  gallery?: GalleryFields | null
  /** Optional per-item display time in seconds. */
  durationSeconds?: number | null
}

export interface SaveResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Effektiv tenant for skriveoperasjoner. Under act-as er dette den aktive tenanten
 * fra requireRole. En tom tenant er en korrekthetsfare (id-baserte muteringer ville
 * mistet sin .eq("tenant_id", …)-scoping), så vi kaster eksplisitt i stedet for å
 * falle tilbake til en vilkårlig første tenant.
 */
function effectiveTenant(tenantId: string): string {
  if (!tenantId) throw new Error("Ingen aktiv tenant")
  return tenantId
}

/** Builds the content_items.body payload, including type-specific fields. */
function buildBody(input: ContentInput): Json {
  const imageUrls = (input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : [])).filter(Boolean)
  return JSON.parse(JSON.stringify({
    html: input.bodyHtml,
    imageUrl: imageUrls[0] ?? input.imageUrl ?? null,
    imageUrls,
    imageMode: input.imageMode ?? "bakgrunn",
    audience: input.audience ?? audienceForType(input.type),
    ...(input.type === "job" ? { contactPerson: input.contactPerson ?? null, applyUrl: input.applyUrl ?? null } : {}),
    ...(input.type === "competition" ? { applyUrl: input.applyUrl ?? null } : {}),
    ...(input.type === "news" ? { applyUrl: input.applyUrl ?? null } : {}),
    ...(input.type === "stats" ? { statsValue: input.statsValue ?? null, statsChange: input.statsChange ?? null } : {}),
    ...(input.type === "slide" && input.offer ? { offer: input.offer } : {}),
    ...(input.type === "slide" && input.campaign && input.campaign.headline ? { campaign: input.campaign } : {}),
    ...((input.type === "slide" || input.type === "competition") ? { avdeling: input.avdeling || "felles" } : {}),
    ...(input.bgColor ? { bgColor: input.bgColor } : {}),
    ...(input.textColor ? { textColor: input.textColor } : {}),
    ...(input.type === "slide" && input.klubb ? { klubb: input.klubb } : {}),
    ...(input.type === "invitation" && input.invitation ? { invitation: input.invitation } : {}),
    ...(input.type === "gallery" && input.gallery ? { gallery: input.gallery } : {}),
    ...(input.durationSeconds ? { durationSeconds: input.durationSeconds } : {}),
  })) as Json
}

export async function saveContent(input: ContentInput, id?: string): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)

  if (!input.title.trim()) return { ok: false, error: "Tittel er påkrevd" }

  const body = buildBody(input)
  const status = input.publish ? "live" : "draft"

  let contentId = id
  if (id) {
    const { error } = await supabase
      .from("content_items")
      .update({
        title: input.title.trim(),
        type: input.type,
        body,
        status,
        valid_from: input.validFrom || null,
        valid_to: input.validTo || null,
        updated_at: new Date().toISOString(),
        published_at: input.publish ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        title: input.title.trim(),
        type: input.type,
        body,
        status,
        tenant_id: tenantId,
        created_by: userId,
        valid_from: input.validFrom || null,
        valid_to: input.validTo || null,
        published_at: input.publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? "Kunne ikke opprette" }
    contentId = data.id
  }

  // Reset and rebuild targets
  await supabase.from("content_targets").delete().eq("content_item_id", contentId!)
  let targetRows: { content_item_id: string; target_all?: boolean; store_id?: string; tag_id?: string }[] = []
  if (input.targetMode === "all") {
    targetRows = [{ content_item_id: contentId!, target_all: true }]
  } else if (input.targetMode === "stores") {
    targetRows = input.storeIds.map((sid) => ({ content_item_id: contentId!, store_id: sid }))
  } else if (input.targetMode === "tags") {
    targetRows = input.tagIds.map((tid) => ({ content_item_id: contentId!, tag_id: tid }))
  }
  if (targetRows.length > 0) {
    const { error } = await supabase.from("content_targets").insert(targetRows)
    if (error) return { ok: false, error: error.message }
  }

  // Skjermene leser publisert innhold live fra Supabase. Kundeskjermen er én
  // stående layout per butikk som alltid viser /widget/tilbud, så ingen ekstern
  // planlegging trengs ved publisering.
  await logAudit({
    userId,
    action: id ? (input.publish ? "content.publish" : "content.update") : (input.publish ? "content.publish" : "content.create"),
    entityType: "content",
    entityId: contentId,
    summary: `${id ? "Endret" : "Opprettet"}${input.publish ? " og publiserte" : ""} «${input.title.trim() || "innhold"}»`,
    metadata: { type: input.type, audience: input.audience ?? audienceForType(input.type), status },
  })
  revalidatePath("/admin/innhold")
  return { ok: true, id: contentId }
}

/** Publishes/unpublishes several items at once. */
export async function bulkSetStatus(ids: string[], publish: boolean): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)
  if (ids.length === 0) return { ok: true }
  const { error } = await supabase
    .from("content_items")
    .update({ status: publish ? "live" : "draft", published_at: publish ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: publish ? "content.publish" : "content.unpublish", entityType: "content", summary: `${publish ? "Publiserte" : "Avpubliserte"} ${ids.length} element(er)`, metadata: { ids } })
  revalidatePath("/admin/innhold")
  return { ok: true }
}

/** Deletes several items (and their targets) at once. */
export async function bulkDeleteContent(ids: string[]): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)
  if (ids.length === 0) return { ok: true }
  await supabase.from("content_targets").delete().in("content_item_id", ids)
  const { error } = await supabase.from("content_items").delete().in("id", ids).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "content.delete", entityType: "content", summary: `Slettet ${ids.length} element(er)`, metadata: { ids } })
  revalidatePath("/admin/innhold")
  return { ok: true }
}

/** Shifts the validity period of several items by N days (e.g. extend +7). */
export async function bulkShiftPeriod(ids: string[], days: number): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)
  if (ids.length === 0) return { ok: true }
  const { data: rows } = await supabase.from("content_items").select("id, valid_from, valid_to").in("id", ids).eq("tenant_id", tenantId)
  for (const r of rows ?? []) {
    await supabase
      .from("content_items")
      .update({ valid_from: shiftIso(r.valid_from, days), valid_to: shiftIso(r.valid_to, days), updated_at: new Date().toISOString() })
      .eq("id", r.id)
      .eq("tenant_id", tenantId)
  }
  await logAudit({ userId, action: "content.extend", entityType: "content", summary: `Forlenget ${ids.length} element(er) med ${days} dager`, metadata: { ids, days } })
  revalidatePath("/admin/innhold")
  return { ok: true }
}

/**
 * Setter manuell visningsrekkefølge (sort_order = posisjon i lista, 0 = først).
 * Id-ene kommer fra den tenant-scopede innholdslista, så rekkefølgen påvirker kun
 * innhold admin allerede ser. Brukes av «Rekkefølge»-dialogen.
 */
export async function reorderContent(orderedIds: string[]): Promise<SaveResult> {
  const { supabase, userId, tenantId } = await requireRole([...AUTHOR_ROLES])
  if (orderedIds.length === 0) return { ok: true }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from("content_items").update({ sort_order: i }).eq("id", orderedIds[i]).eq("tenant_id", tenantId)
    if (error) return { ok: false, error: error.message }
  }
  await logAudit({ userId, action: "content.reorder", entityType: "content", summary: `Endret rekkefølge på ${orderedIds.length} element(er)`, metadata: { count: orderedIds.length } })
  revalidatePath("/admin/innhold")
  revalidatePath("/admin/kundeinnhold")
  return { ok: true }
}

export async function deleteContent(id: string): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)
  const { data: row } = await supabase.from("content_items").select("title").eq("id", id).eq("tenant_id", tenantId).maybeSingle()
  await supabase.from("content_targets").delete().eq("content_item_id", id)
  const { error } = await supabase.from("content_items").delete().eq("id", id).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId, action: "content.delete", entityType: "content", entityId: id, summary: `Slettet «${row?.title ?? id}»` })
  revalidatePath("/admin/innhold")
  return { ok: true }
}

/** Shifts an ISO date (YYYY-MM-DD…) by N days, preserving null. */
function shiftIso(iso: string | null, days: number): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Duplicates a content item as a new draft. With shiftDays (e.g. 7), the
 * validity period is moved forward — "kopier til neste uke" for weekly offers.
 */
export async function duplicateContent(id: string, shiftDays = 0): Promise<SaveResult> {
  const { supabase, userId, tenantId: rawTenant } = await requireRole([...AUTHOR_ROLES])
  const tenantId = effectiveTenant(rawTenant)
  const { data: orig } = await supabase
    .from("content_items")
    .select("title, type, body, valid_from, valid_to")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()
  if (!orig) return { ok: false, error: "Fant ikke innholdet" }

  const suffix = shiftDays > 0 ? "(neste uke)" : "(kopi)"
  const { data: copy, error } = await supabase
    .from("content_items")
    .insert({
      title: `${orig.title} ${suffix}`,
      type: orig.type,
      body: orig.body,
      status: "draft",
      tenant_id: tenantId,
      created_by: userId,
      valid_from: shiftIso(orig.valid_from, shiftDays),
      valid_to: shiftIso(orig.valid_to, shiftDays),
    })
    .select("id")
    .single()
  if (error || !copy) return { ok: false, error: error?.message ?? "Kunne ikke kopiere" }

  const { data: targets } = await supabase.from("content_targets").select("target_all, store_id, tag_id").eq("content_item_id", id)
  if (targets && targets.length > 0) {
    await supabase.from("content_targets").insert(
      targets.map((t) => ({ content_item_id: copy.id, target_all: t.target_all, store_id: t.store_id, tag_id: t.tag_id }))
    )
  }
  await logAudit({ userId, action: "content.duplicate", entityType: "content", entityId: copy.id, summary: `Kopierte «${orig.title}»${shiftDays > 0 ? " til neste uke" : ""}`, metadata: { from: id, shiftDays } })
  revalidatePath("/admin/innhold")
  return { ok: true, id: copy.id }
}
