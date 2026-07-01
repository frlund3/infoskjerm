import QRCode from "qrcode"
import { htmlToBlocks, type LiveItem } from "@/lib/content/live"
import { CampaignCard } from "@/app/widget/kampanje/campaign-card"
import { getBaseUrl } from "@/lib/base-url"
import { TilbudRotator } from "@/app/widget/tilbud/tilbud-rotator"
import { NewsRotator } from "@/app/widget/nyheter/news-rotator"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"

/**
 * Universal live preview: renders an UNSAVED content item exactly as it will
 * appear on screen, by feeding a single synthetic item into the real customer
 * (TilbudRotator) or internal (NewsRotator) renderers. The CMS editor embeds
 * this in a scaled iframe and re-points it on every change, so every content
 * type (offer, poster, PDF, competition, news, …) previews 1:1 with the screen.
 *
 * Usage: /widget/preview?d=<base64url JSON of the form fields>
 */

export const dynamic = "force-dynamic"

interface PreviewData {
  type?: string
  audience?: "kunde" | "intern"
  title?: string
  bodyHtml?: string
  imageUrl?: string | null
  imageUrls?: string[]
  imageMode?: "plakat" | "bakgrunn" | "liten"
  offer?: LiveItem["offer"]
  campaign?: LiveItem["campaign"]
  avdeling?: string | null
  bgColor?: string | null
  textColor?: string | null
  validFrom?: string | null
  validTo?: string | null
  applyUrl?: string | null
  contactPerson?: string | null
  statsValue?: string | null
  statsChange?: string | null
  klubb?: { headline: string; subtext: string; url?: string; cta?: string } | null
  invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null; signupUrl?: string | null } | null
  gallery?: { theme?: string; items?: { name?: string; price?: string | null; priceInfo?: string | null; imageUrl?: string | null }[]; qrUrl?: string | null; qrLabel?: string | null } | null
  chain?: { name: string; logoUrl: string | null; color: string; brandFg: string | null } | null
}

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default async function PreviewWidgetPage({ searchParams }: { searchParams: Promise<{ d?: string; o?: string }> }) {
  const { d, o } = await searchParams
  let data: PreviewData = {}
  try {
    if (d) data = JSON.parse(Buffer.from(d, "base64url").toString("utf-8"))
  } catch { /* malformed → empty preview */ }

  const type = data.type || "slide"
  const imageUrls = (data.imageUrls?.length ? data.imageUrls : data.imageUrl ? [data.imageUrl] : []).filter(Boolean)
  const firstImage = imageUrls[0] ?? null

  const item: LiveItem = {
    id: "preview",
    type,
    title: data.title || "",
    blocks: htmlToBlocks(data.bodyHtml ?? ""),
    imageUrl: firstImage,
    imageUrls,
    imageMode: data.imageMode === "plakat" ? "plakat" : data.imageMode === "liten" ? "liten" : "bakgrunn",
    isPdf: (firstImage ?? "").toLowerCase().split("?")[0].endsWith(".pdf"),
    isVideo: /\.(mp4|webm|mov|m4v)$/.test((firstImage ?? "").toLowerCase().split("?")[0]),
    durationSeconds: null,
    pages: [],
    validFrom: data.validFrom || null,
    validTo: data.validTo || null,
    author: "",
    date: "",
    contactPerson: data.contactPerson ?? null,
    applyUrl: data.applyUrl ?? null,
    statsValue: data.statsValue ?? null,
    statsChange: data.statsChange ?? null,
    offer: data.offer && data.offer.varenavn ? data.offer : null,
    campaign: data.campaign && data.campaign.headline
      ? {
          category: data.campaign.category ?? null,
          headline: data.campaign.headline,
          subtext: data.campaign.subtext ?? null,
          price: data.campaign.price ?? null,
          accent: data.campaign.accent ?? null,
        }
      : null,
    avdeling: data.avdeling || "felles",
    bgColor: data.bgColor ?? null,
    textColor: data.textColor ?? null,
    klubb: data.klubb && data.klubb.headline ? data.klubb : null,
    invitation: type === "invitation"
      ? {
          eventDate: data.invitation?.eventDate ?? null,
          eventPlace: data.invitation?.eventPlace ?? null,
          signupEnabled: data.invitation?.signupEnabled ?? true,
          signupDeadline: data.invitation?.signupDeadline ?? null,
          signupUrl: data.invitation?.signupUrl ?? null,
        }
      : null,
    gallery: type === "gallery"
      ? {
          theme: data.gallery?.theme === "meny" ? "meny" : data.gallery?.theme === "ansattilbud" ? "ansattilbud" : "catering",
          items: (data.gallery?.items ?? []).filter((x) => x && (x.name || x.imageUrl)).map((x) => ({ name: x.name ?? "", price: x.price ?? null, priceInfo: x.priceInfo ?? null, imageUrl: x.imageUrl ?? null })),
          qrUrl: data.gallery?.qrUrl ?? null,
          qrLabel: data.gallery?.qrLabel ?? null,
        }
      : null,
  }

  // QR for competitions/jobs + articles with a link (applyUrl) + kundeklubb.
  const qr: Record<string, string> = {}
  if ((type === "competition" || type === "job" || type === "news") && data.applyUrl?.trim()) {
    try {
      qr.preview = await QRCode.toDataURL(normalizeUrl(data.applyUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
    } catch { /* best-effort */ }
  }
  if (type === "invitation" && item.invitation?.signupEnabled !== false) {
    try {
      const target = item.invitation?.signupUrl?.trim() ? normalizeUrl(item.invitation.signupUrl) : `${await getBaseUrl()}/pamelding/forhandsvisning`
      qr.preview = await QRCode.toDataURL(target, { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
    } catch { /* best-effort */ }
  }
  if (type === "gallery" && item.gallery?.qrUrl?.trim()) {
    try {
      qr.preview = await QRCode.toDataURL(normalizeUrl(item.gallery.qrUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
    } catch { /* best-effort */ }
  }
  if (item.klubb) {
    try {
      const target = data.klubb?.url?.trim() ? normalizeUrl(data.klubb.url) : `${await getBaseUrl()}/klubb/forhandsvisning`
      qr.preview = await QRCode.toDataURL(target, { margin: 1, width: 700, color: { dark: "#0a0a0a", light: "#ffffff" } })
    } catch { /* best-effort */ }
  }

  const chain: ChainBrand | null = data.chain
    ? { name: data.chain.name, logoUrl: data.chain.logoUrl, color: data.chain.color, brandFg: data.chain.brandFg }
    : null

  // Orientering: eksplisitt `o` (fra editorens toggle) styrer; ellers standard ut
  // fra innholdet (kampanje + intern = liggende, kunde = stående). Slik kan ALLE
  // maler forhåndsvises i BÅDE stående (TilbudRotator) og liggende (NewsRotator).
  const landscape = o ? o === "landscape" : (!!item.campaign || data.audience === "intern")

  // Kampanjekortet er designet for liggende — vis det i sin egen fullskjerm-ramme.
  if (item.campaign && landscape) {
    return (
      <main style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#0a0a0c" }}>
        <CampaignCard item={item} chain={chain} />
      </main>
    )
  }

  if (landscape) {
    return <NewsRotator items={[item]} qr={qr} ticker={[]} />
  }
  return <TilbudRotator items={[item]} ticker={[]} storeName={null} chain={chain} qr={qr} />
}
