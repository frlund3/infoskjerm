import { requireRole } from "@/lib/admin/require-role"
import { canTargetAllStores } from "@/lib/roles"
import { notFound } from "next/navigation"
import { ContentForm, type TagOption, type ContentInitial } from "./content-form"
import { loadStoreOptions } from "../store-options"
import type { ContentType, TargetMode } from "../actions"
import { audienceForType, type Audience } from "../audience"

/**
 * Shared edit view, rendered by both /admin/innhold/[id] and
 * /admin/kundeinnhold/[id] so a customer item edits under the customer route
 * (keeping the right sidebar section active) while reusing one implementation.
 */

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export async function EditContentView({ id, listHref }: { id: string; listHref?: string }) {
  const { supabase, role, tenantId } = await requireRole([...AUTHOR_ROLES])

  const [{ data: item }, storeOptions, { data: tags }, { data: targets }] = await Promise.all([
    supabase.from("content_items").select("id, title, type, body, valid_from, valid_to").eq("id", id).eq("tenant_id", tenantId).single(),
    loadStoreOptions(supabase, tenantId),
    supabase.from("tags").select("id, name, color").eq("tenant_id", tenantId).order("name"),
    supabase.from("content_targets").select("target_all, store_id, tag_id").eq("content_item_id", id),
  ])

  if (!item) notFound()

  const body = (item.body ?? {}) as {
    html?: string; imageUrl?: string | null; imageUrls?: string[]; imageMode?: "plakat" | "bakgrunn" | "liten"
    audience?: Audience
    contactPerson?: string | null; applyUrl?: string | null; statsValue?: string | null; statsChange?: string | null
    offer?: import("@/lib/content/live").OfferFields | null
    campaign?: import("@/lib/content/live").CampaignFields | null
    avdeling?: string | null
    bgColor?: string | null; textColor?: string | null
    klubb?: { headline: string; subtext: string } | null
    invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null; signupUrl?: string | null } | null
    gallery?: { theme?: "catering" | "meny" | "ansattilbud"; items?: { name?: string; price?: string | null; priceInfo?: string | null; imageUrl?: string | null }[]; qrUrl?: string | null; qrLabel?: string | null } | null
    durationSeconds?: number | null
    pages?: string[]
  }
  const audience: Audience = body.audience === "kunde" || body.audience === "intern" ? body.audience : audienceForType(item.type as ContentType)
  const targetRows = targets ?? []
  let targetMode: TargetMode = "all"
  if (targetRows.some((t) => t.store_id)) targetMode = "stores"
  else if (targetRows.some((t) => t.tag_id)) targetMode = "tags"
  else if (targetRows.some((t) => t.target_all)) targetMode = "all"

  const initial: ContentInitial = {
    id: item.id,
    title: item.title,
    type: item.type as ContentType,
    bodyHtml: body.html ?? "",
    imageUrl: body.imageUrl ?? null,
    imageUrls: body.imageUrls?.length ? body.imageUrls : body.imageUrl ? [body.imageUrl] : [],
    pages: Array.isArray(body.pages) ? body.pages.filter(Boolean) : undefined,
    targetMode,
    storeIds: targetRows.filter((t) => t.store_id).map((t) => t.store_id as string),
    tagIds: targetRows.filter((t) => t.tag_id).map((t) => t.tag_id as string),
    validFrom: item.valid_from ? item.valid_from.slice(0, 10) : null,
    validTo: item.valid_to ? item.valid_to.slice(0, 10) : null,
    imageMode: body.imageMode ?? "bakgrunn",
    offer: body.offer ?? null,
    campaign: body.campaign ?? null,
    avdeling: body.avdeling ?? "felles",
    contactPerson: body.contactPerson ?? null,
    applyUrl: body.applyUrl ?? null,
    statsValue: body.statsValue ?? null,
    statsChange: body.statsChange ?? null,
    bgColor: body.bgColor ?? null,
    textColor: body.textColor ?? null,
    klubb: body.klubb ?? null,
    invitation: body.invitation
      ? {
          eventDate: body.invitation.eventDate ?? null,
          eventPlace: body.invitation.eventPlace ?? null,
          signupEnabled: body.invitation.signupEnabled ?? true,
          signupDeadline: body.invitation.signupDeadline ?? null,
          signupUrl: body.invitation.signupUrl ?? null,
        }
      : null,
    gallery: body.gallery
      ? {
          theme: body.gallery.theme === "meny" ? "meny" : body.gallery.theme === "ansattilbud" ? "ansattilbud" : "catering",
          items: (body.gallery.items ?? []).map((x) => ({ name: x.name ?? "", price: x.price ?? null, priceInfo: x.priceInfo ?? null, imageUrl: x.imageUrl ?? null })),
          qrUrl: body.gallery.qrUrl ?? null,
          qrLabel: body.gallery.qrLabel ?? null,
        }
      : null,
    durationSeconds: body.durationSeconds ?? null,
  }

  return <ContentForm stores={storeOptions} tags={(tags ?? []) as TagOption[]} initial={initial} audience={audience} listHref={listHref} canTargetAll={canTargetAllStores(role)} />
}
