import { createAdminClient } from "@/lib/supabase/server"

/**
 * Reads published, in-window content straight from Supabase for the signage
 * widgets (server-only, service role — the widgets render this as webpages that
 * Xibo embeds). This is the single source of truth: publishing writes to
 * `content_items`, and the screens read it live here.
 */

export type ImageMode = "plakat" | "bakgrunn" | "liten"

/** A text block parsed from the authored rich text — rendered as React (no raw HTML). */
export interface Block {
  kind: "h" | "p" | "li"
  text: string
}

/** Structured retail offer (the «tilbudskort» builder) — rendered as a price card. */
export interface OfferFields {
  varenavn: string
  vareinfo: string | null
  /** Badge text, e.g. TILBUD / KNALLPRIS / NYHET. */
  badge: string | null
  /** Headline price, e.g. "39,90". */
  pris: string | null
  /** Discount instead of/with price, e.g. "-30%". */
  rabatt: string | null
  /** Before-price (strikethrough), e.g. "59,90". */
  forpris: string | null
  /** Optional decorative tag/sticker, e.g. "Sommervibber". */
  tag: string | null
  /** Unit price, e.g. "kr 79,80/kg". */
  enhetspris: string | null
  /** Max per customer, e.g. "Maks 5 per kunde". */
  maks: string | null
  /** "+ pant" note. */
  pant: boolean
}

export interface LiveItem {
  id: string
  type: string
  title: string
  blocks: Block[]
  imageUrl: string | null
  /** All attached images (≥1). 2+ → rendered full-page, side by side. */
  imageUrls: string[]
  imageMode: ImageMode
  isPdf: boolean
  /** Pre-rendered flyer page images (kundeavis) — shown instead of client PDF. */
  pages: string[]
  validFrom: string | null
  validTo: string | null
  author: string
  date: string
  contactPerson: string | null
  applyUrl: string | null
  statsValue: string | null
  statsChange: string | null
  /** Set when the offer was authored as a structured price card (not a poster). */
  offer: OfferFields | null
  /** Department/category, e.g. "frukt"/"ferskvare". "felles" = whole store. */
  avdeling: string
  /** Optional card background colour (text cards). null = default dark theme. */
  bgColor: string | null
  /** Optional card text colour. null = default light-on-dark. */
  textColor: string | null
}

interface Body {
  html?: string
  imageUrl?: string | null
  imageUrls?: string[]
  imageMode?: ImageMode
  contactPerson?: string | null
  applyUrl?: string | null
  statsValue?: string | null
  statsChange?: string | null
  offer?: OfferFields | null
  avdeling?: string | null
  bgColor?: string | null
  textColor?: string | null
  pages?: string[]
}

interface Target {
  target_all: boolean | null
  store_id: string | null
  tag_id: string | null
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .trim()
}

/**
 * Parses the admin-authored Tiptap HTML into plain-text blocks (headings,
 * paragraphs, list items). Output is text only — the signage widget renders it
 * as React elements, so no raw HTML is ever injected (no XSS surface).
 */
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = []
  const re = /<(h[1-6]|li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi
  for (const m of html.matchAll(re)) {
    const tag = m[1].toLowerCase()
    const text = stripTags(m[2].replace(/<br\s*\/?>/gi, " "))
    if (!text) continue
    blocks.push({ kind: tag.startsWith("h") ? "h" : tag === "li" ? "li" : "p", text })
  }
  return blocks
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })
}

function withinWindow(from: string | null, to: string | null, now: number): boolean {
  if (from && new Date(from).getTime() > now) return false
  if (to && new Date(to).getTime() < now) return false
  return true
}

/**
 * Fetches live content for a store (or all stores when storeId is null),
 * filtered by targeting + validity window, newest first.
 *
 * @param storeId  Supabase store id, or null for the all-stores base feed.
 * @param types    content_type values to include.
 */
export async function fetchLiveContent(storeId: string | null, types: string[], audience?: "kunde" | "intern", avdeling?: string): Promise<LiveItem[]> {
  const supabase = createAdminClient()
  const now = Date.now()

  const audienceOf = (type: string, body: { audience?: string } | null): "kunde" | "intern" => {
    const a = body?.audience
    return a === "kunde" || a === "intern" ? a : type === "slide" ? "kunde" : "intern"
  }

  const { data: items } = await supabase
    .from("content_items")
    .select("id, type, title, body, created_by, created_at, published_at, valid_from, valid_to, content_targets(target_all, store_id, tag_id)")
    .eq("status", "live")
    .in("type", types as ("news" | "competition" | "stats" | "weather" | "slide" | "job" | "birthday" | "ticker")[])
    .order("published_at", { ascending: false, nullsFirst: false })

  if (!items || items.length === 0) return []

  // Tag → stores map (only needed when filtering by a specific store).
  let tagToStores = new Map<string, Set<string>>()
  if (storeId) {
    const { data: storeTags } = await supabase.from("store_tags").select("store_id, tag_id")
    tagToStores = (storeTags ?? []).reduce((m, r) => {
      if (r.tag_id && r.store_id) {
        if (!m.has(r.tag_id)) m.set(r.tag_id, new Set())
        m.get(r.tag_id)!.add(r.store_id)
      }
      return m
    }, new Map<string, Set<string>>())
  }

  function targets(item: NonNullable<typeof items>[number]): boolean {
    if (!storeId) return true
    const ts = (item.content_targets ?? []) as Target[]
    if (ts.some((t) => t.target_all)) return true
    for (const t of ts) {
      if (t.store_id === storeId) return true
      if (t.tag_id && tagToStores.get(t.tag_id)?.has(storeId)) return true
    }
    return false
  }

  // A department screen shows its own department + "felles" (whole-store) items.
  // An "felles"/main screen (or no department) shows everything.
  const matchAvdeling = (body: { avdeling?: string } | null): boolean => {
    if (!avdeling || avdeling === "felles") return true
    const a = body?.avdeling || "felles"
    return a === avdeling || a === "felles"
  }

  const visible = items.filter(
    (it) =>
      withinWindow(it.valid_from, it.valid_to, now) &&
      targets(it) &&
      (!audience || audienceOf(it.type, it.body as { audience?: string } | null) === audience) &&
      matchAvdeling(it.body as { avdeling?: string } | null)
  )

  // Resolve author names in one batch.
  const authorIds = Array.from(new Set(visible.map((i) => i.created_by).filter(Boolean))) as string[]
  const authorName = new Map<string, string>()
  if (authorIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", authorIds)
    for (const u of users ?? []) authorName.set(u.id, u.full_name || u.email || "")
  }

  return visible.map((it) => {
    const body = (it.body ?? {}) as Body
    const imageUrls = (body.imageUrls?.length ? body.imageUrls : body.imageUrl ? [body.imageUrl] : []).filter(Boolean)
    const firstImage = imageUrls[0] ?? null
    return {
      id: it.id,
      type: it.type,
      title: it.title,
      blocks: htmlToBlocks(body.html ?? ""),
      imageUrl: firstImage,
      imageUrls,
      imageMode: body.imageMode === "plakat" ? "plakat" : body.imageMode === "liten" ? "liten" : "bakgrunn",
      isPdf: (firstImage ?? "").toLowerCase().split("?")[0].endsWith(".pdf"),
      pages: Array.isArray(body.pages) ? body.pages.filter(Boolean) : [],
      validFrom: it.valid_from,
      validTo: it.valid_to,
      author: it.created_by ? authorName.get(it.created_by) ?? "" : "",
      date: formatDate(it.published_at || it.created_at),
      contactPerson: body.contactPerson ?? null,
      applyUrl: body.applyUrl ?? null,
      statsValue: body.statsValue ?? null,
      statsChange: body.statsChange ?? null,
      offer: body.offer && body.offer.varenavn ? body.offer : null,
      avdeling: body.avdeling || "felles",
      bgColor: body.bgColor ?? null,
      textColor: body.textColor ?? null,
    }
  })
}
