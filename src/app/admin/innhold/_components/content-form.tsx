"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { MediaUploader } from "@/components/admin/media-uploader"
import { Button } from "@/components/ui/button"
import { saveContent, type ContentType, type TargetMode, type ImageMode, type Audience, type InvitationFields, type GalleryFields, type GalleryItem } from "../actions"
import { lookupSparProduct } from "../spar-actions"
import type { OfferFields } from "@/lib/content/live"
import { LivePreview } from "./live-preview"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Newspaper, Trophy, ImageIcon, Briefcase, PartyPopper, Megaphone, FileText, Ticket, MapPin, LayoutGrid, Plus, Trash2, QrCode,
  Store as StoreIcon, Tag, Globe, X, Calendar, Save, Send, ChevronLeft, Image as ImageLucide, Maximize2, PanelRight, CalendarOff, Search,
} from "lucide-react"
import Link from "next/link"

export interface StoreOption { id: string; name: string; chain: string | null; city: string | null; tagIds?: string[] }
export interface TagOption { id: string; name: string; color: string | null }

// Background/text colour presets for internal text cards.
const COLOR_PRESETS: { label: string; bg: string; fg: string }[] = [
  { label: "Mørk", bg: "#0a0a0a", fg: "#ffffff" },
  { label: "Lys", bg: "#ffffff", fg: "#0a0a0a" },
  { label: "Rød", bg: "#e4002b", fg: "#ffffff" },
  { label: "Grønn", bg: "#16a34a", fg: "#ffffff" },
  { label: "Marine", bg: "#0b1f3a", fg: "#ffffff" },
]

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Monday–Sunday of the current week + offsetWeeks (Norwegian week, Mon start). */
function campaignWeek(offsetWeeks: number): [string, string] {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // Monday = 0
  const mon = new Date(now); mon.setDate(now.getDate() - day + offsetWeeks * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return [isoDate(mon), isoDate(sun)]
}

/** Today → last day of the current month. */
function restOfMonth(): [string, string] {
  const now = new Date()
  return [isoDate(now), isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))]
}

export interface ContentInitial {
  id: string
  title: string
  type: ContentType
  bodyHtml: string
  imageUrl: string | null
  imageUrls?: string[]
  imageMode?: ImageMode
  targetMode: TargetMode
  storeIds: string[]
  tagIds: string[]
  validFrom: string | null
  validTo: string | null
  contactPerson?: string | null
  applyUrl?: string | null
  statsValue?: string | null
  statsChange?: string | null
  offer?: OfferFields | null
  avdeling?: string | null
  bgColor?: string | null
  textColor?: string | null
  klubb?: { headline: string; subtext: string } | null
  invitation?: InvitationFields | null
  gallery?: GalleryFields | null
  durationSeconds?: number | null
}

const EMPTY_INVITATION: InvitationFields = {
  eventDate: null, eventPlace: null, signupEnabled: true, signupDeadline: null, signupUrl: null,
}

const EMPTY_GALLERY: GalleryFields = {
  theme: "catering", items: [{ name: "", price: null, priceInfo: null, imageUrl: null }], qrUrl: null, qrLabel: null,
}

const GALLERY_THEMES: { k: GalleryFields["theme"]; label: string }[] = [
  { k: "catering", label: "Catering" },
  { k: "meny", label: "Meny" },
  { k: "ansattilbud", label: "Ansattilbud" },
]

const EMPTY_OFFER: OfferFields = {
  varenavn: "", vareinfo: null, badge: null, pris: null, rabatt: null, forpris: null,
  tag: null, enhetspris: null, maks: null, pant: false,
}

const BADGES = ["TILBUD", "KNALLPRIS", "NYHET", "SUPERPRIS", "KAMPANJE"]

// Avdelinger lastes nå per tenant (bil vs mat) via useTenantConfig().

const OFFER_GRID: { k: keyof OfferFields; label: string; ph: string }[] = [
  { k: "pris", label: "Pris", ph: "39,90" },
  { k: "forpris", label: "Førpris", ph: "59,90" },
  { k: "rabatt", label: "Rabatt", ph: "-30 %" },
  { k: "tag", label: "Tag (valgfri)", ph: "Sommervibber" },
  { k: "enhetspris", label: "Enhetspris", ph: "kr 79,80/kg" },
  { k: "maks", label: "Maks per kunde", ph: "Maks 5" },
]

const TYPES: { key: ContentType; label: string; icon: React.ElementType }[] = [
  { key: "news", label: "Nyhet", icon: Newspaper },
  { key: "competition", label: "Konkurranse", icon: Trophy },
  { key: "slide", label: "Tilbud / annet", icon: ImageIcon },
  { key: "job", label: "Stilling", icon: Briefcase },
  { key: "birthday", label: "Gratulerer", icon: PartyPopper },
  { key: "invitation", label: "Invitasjon", icon: Ticket },
  { key: "gallery", label: "Galleri", icon: LayoutGrid },
  { key: "ticker", label: "Ticker", icon: Megaphone },
]

const IMAGE_TYPES: ContentType[] = ["news", "competition", "slide", "job", "birthday", "invitation"]

// Which content types belong to each audience/menu.
const AUDIENCE_TYPES: Record<Audience, ContentType[]> = {
  // Kunde: tilbud, konkurranse, artikkel/egenreklame, galleri (catering/meny) + valgfri ticker.
  kunde: ["slide", "competition", "news", "gallery", "ticker"],
  // Internt kan også vise tilbud/plakat (f.eks. ukens tilbud til betjeningen),
  // invitasjoner til arrangement (julebord, kurs …) og galleri (ansattilbud).
  intern: ["news", "competition", "job", "birthday", "invitation", "gallery", "ticker", "slide"],
}

export function ContentForm({ stores, tags, initial, audience = "intern", defaultType, listHref: listHrefProp, prefillImage, canTargetAll = true }: { stores: StoreOption[]; tags: TagOption[]; initial?: ContentInitial; audience?: Audience; defaultType?: ContentType; listHref?: string; prefillImage?: string; canTargetAll?: boolean }) {
  const router = useRouter()
  const { avdelinger: AVDELINGER, unitLabelPlural } = useTenantConfig()
  const allowedTypes = AUDIENCE_TYPES[audience]
  // defaultType locks the picker to one type (dedicated entry points, e.g. Invitasjoner).
  const typeOptions = TYPES.filter((t) => (defaultType ? t.key === defaultType : allowedTypes.includes(t.key)))
  const listHref = listHrefProp ?? (audience === "kunde" ? "/admin/kundeinnhold" : "/admin/innhold")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<ContentType>(initial?.type ?? defaultType ?? allowedTypes[0])
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "")
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.imageUrls?.length ? initial.imageUrls : initial?.imageUrl ? [initial.imageUrl] : prefillImage ? [prefillImage] : [])
  // Butikk-roller (canTargetAll=false) kan kun målrette egne butikker — start på "stores".
  const [targetMode, setTargetMode] = useState<TargetMode>(initial?.targetMode ?? (canTargetAll ? "all" : "stores"))
  // Kundeinnhold: tving et bevisst «Vis på»-valg (ingen «Alle» som standard), så
  // man ikke ved et uhell publiserer til alle kundeskjermer. Intern + redigering
  // beholder dagens oppførsel.
  const [targetChosen, setTargetChosen] = useState<boolean>(audience !== "kunde" || !!initial)
  const [storeIds, setStoreIds] = useState<string[]>(initial?.storeIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "")
  const [validTo, setValidTo] = useState(initial?.validTo ?? "")
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "")
  const [applyUrl, setApplyUrl] = useState(initial?.applyUrl ?? "")
  const [imageMode, setImageMode] = useState<ImageMode>(initial?.imageMode ?? "bakgrunn")
  const [offerMode, setOfferMode] = useState<"struktur" | "plakat" | "klubb">(initial?.offer ? "struktur" : initial?.klubb ? "klubb" : "plakat")
  const [offer, setOffer] = useState<OfferFields>(initial?.offer ?? EMPTY_OFFER)
  const [klubb, setKlubb] = useState(initial?.klubb ?? { headline: "Bli medlem – det er gratis", subtext: "Medlemspriser, bonus og ukens beste tilbud." })
  const [avdeling, setAvdeling] = useState(initial?.avdeling ?? "felles")
  const [invitation, setInvitation] = useState<InvitationFields>(initial?.invitation ?? EMPTY_INVITATION)
  const [gallery, setGallery] = useState<GalleryFields>(
    initial?.gallery ?? { ...EMPTY_GALLERY, theme: audience === "intern" ? "ansattilbud" : "catering" }
  )
  const [bgColor, setBgColor] = useState(initial?.bgColor ?? "")
  const [textColor, setTextColor] = useState(initial?.textColor ?? "")
  const [storeSearch, setStoreSearch] = useState("")
  const [chainF, setChainF] = useState("")
  const [durationSeconds, setDurationSeconds] = useState<string>(initial?.durationSeconds ? String(initial.durationSeconds) : "")
  const [saving, setSaving] = useState(false)
  const [confirmNoEndDate, setConfirmNoEndDate] = useState(false)

  const isOfferStruktur = type === "slide" && offerMode === "struktur"
  const isKlubb = type === "slide" && offerMode === "klubb"
  // Utseende (bakgrunn/skrift) på alt innhold unntatt ticker, strukturert
  // tilbudskort og kundeklubb (de har egne, faste design).
  const usesColors = type !== "ticker" && !isOfferStruktur && !isKlubb
  // Kundeklubb styres per butikk (Butikker → butikk → Kundeklubb), ikke som
  // innholdselement — så ingen «klubb»-modus her.
  const OFFER_MODES: { k: "struktur" | "plakat" | "klubb"; label: string }[] = [
    { k: "struktur", label: "Bygg tilbudskort" },
    { k: "plakat", label: "Last opp plakat / PDF" },
  ]

  // How many stores the current targeting reaches (live feedback).
  const reach = (() => {
    if (targetMode === "all") return stores.length
    if (targetMode === "stores") return storeIds.length
    const hit = new Set<string>()
    for (const s of stores) if ((s.tagIds ?? []).some((t) => tagIds.includes(t))) hit.add(s.id)
    return hit.size
  })()
  const setOf = (k: keyof OfferFields, v: string) => setOffer((p) => ({ ...p, [k]: v.trim() || null }))

  const [gtinInput, setGtinInput] = useState("")
  const [looking, setLooking] = useState(false)
  async function doLookup() {
    if (!gtinInput.trim() || looking) return
    setLooking(true)
    const res = await lookupSparProduct(gtinInput)
    setLooking(false)
    if (!res.ok || !res.product) { toast.error(res.error ?? "Fant ikke varen på spar.no"); return }
    const p = res.product
    setOffer((prev) => ({
      ...prev,
      varenavn: p.varenavn ?? prev.varenavn,
      vareinfo: p.vareinfo ?? prev.vareinfo,
      // Spar-prisen settes både som pris og førpris — senk «Pris» til tilbudsprisen.
      pris: p.pris ?? prev.pris,
      forpris: p.pris ?? prev.forpris,
      enhetspris: p.enhetspris ?? prev.enhetspris,
      pant: p.pant || prev.pant,
    }))
    setImageUrls([p.imageUrl])
    toast.success(p.varenavn ? `Hentet «${p.varenavn}»` : "Hentet produktbilde")
  }

  // Forhåndsutfyll fradato med dagens dato for nytt innhold (ikke ved redigering).
  // Settes på klienten for å unngå SSR/klient-hydration-mismatch på datoen.
  useEffect(() => {
    if (!initial) {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      setValidFrom((prev) => prev || today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave: keep an unsaved draft in localStorage for NEW content only, so a
  // half-written post survives an accidental navigation/refresh.
  const draftKey = initial ? null : `infoskjerm:draft:${audience}${defaultType ? `:${defaultType}` : ""}`
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    if (!draftKey) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.title) setTitle(d.title)
      if (d.type) setType(d.type)
      if (d.bodyHtml) setBodyHtml(d.bodyHtml)
      if (Array.isArray(d.imageUrls)) setImageUrls(d.imageUrls)
      if (d.offer) setOffer(d.offer)
      if (d.offerMode) setOfferMode(d.offerMode)
      if (d.avdeling) setAvdeling(d.avdeling)
      if (d.validFrom) setValidFrom(d.validFrom)
      if (d.validTo) setValidTo(d.validTo)
      if (d.targetMode) { setTargetMode(d.targetMode); setTargetChosen(true) }
      if (Array.isArray(d.storeIds)) setStoreIds(d.storeIds)
      if (Array.isArray(d.tagIds)) setTagIds(d.tagIds)
      if (d.bgColor) setBgColor(d.bgColor)
      if (d.textColor) setTextColor(d.textColor)
      if (d.contactPerson) setContactPerson(d.contactPerson)
      if (d.applyUrl) setApplyUrl(d.applyUrl)
      setRestored(true)
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftKey) return
    const hasContent = title.trim() || offer.varenavn.trim() || bodyHtml.trim() || imageUrls.length > 0
    const id = setTimeout(() => {
      try {
        if (hasContent) localStorage.setItem(draftKey, JSON.stringify({ title, type, bodyHtml, imageUrls, offer, offerMode, avdeling, validFrom, validTo, targetMode, storeIds, tagIds, bgColor, textColor, contactPerson, applyUrl }))
        else localStorage.removeItem(draftKey)
      } catch { /* storage full/blocked — non-fatal */ }
    }, 600)
    return () => clearTimeout(id)
  }, [draftKey, title, type, bodyHtml, imageUrls, offer, offerMode, avdeling, validFrom, validTo, targetMode, storeIds, tagIds, bgColor, textColor, contactPerson, applyUrl])

  const discardDraft = () => {
    if (draftKey) { try { localStorage.removeItem(draftKey) } catch {} }
    window.location.reload()
  }

  const usesImage = IMAGE_TYPES.includes(type) && !isKlubb
  const usesBody = type !== "ticker" && type !== "gallery" && !isOfferStruktur && !isKlubb
  // Standard visningstid per type/flate (matcher rotatorene). Vises til brukeren
  // så de vet hva «tom = standard» faktisk betyr.
  const defaultDuration = audience === "kunde"
    ? 18
    : ({ stats: 12, job: 20, competition: 16, invitation: 18, gallery: 30 } as Record<string, number>)[type] ?? 16
  // Tilbud/annonser må alltid ha en gyldig periode (fra + til).
  const periodRequired = type === "slide" && !isKlubb
  const isPdfUrl = (imageUrls[0] ?? "").toLowerCase().split("?")[0].endsWith(".pdf")
  const MAX_IMAGES = 4
  const isMulti = imageUrls.length >= 2
  const canAddMore = !isPdfUrl && imageUrls.length < MAX_IMAGES
  const addImages = (urls: string[]) => setImageUrls((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))
  const removeImage = (url: string) => setImageUrls((prev) => prev.filter((u) => u !== url))

  const toggleStore = (id: string) => setStoreIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleTag = (id: string) => setTagIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  // Store picker: search + chain filter + select-all over the filtered set.
  const chains = Array.from(new Set(stores.map((s) => s.chain).filter(Boolean))) as string[]
  const visibleStores = stores.filter((s) => {
    if (chainF && s.chain !== chainF) return false
    if (storeSearch) {
      const q = storeSearch.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !(s.city ?? "").toLowerCase().includes(q)) return false
    }
    return true
  })
  const allVisibleSelected = visibleStores.length > 0 && visibleStores.every((s) => storeIds.includes(s.id))
  const toggleAllVisible = () => setStoreIds((prev) => {
    const ids = visibleStores.map((s) => s.id)
    if (ids.every((id) => prev.includes(id))) return prev.filter((id) => !ids.includes(id))
    return Array.from(new Set([...prev, ...ids]))
  })

  function handleSave(publish: boolean) {
    if (isOfferStruktur) {
      if (!offer.varenavn.trim()) { toast.error("Skriv et varenavn"); return }
    } else if (isKlubb) {
      if (!klubb.headline.trim()) { toast.error("Skriv en overskrift"); return }
    } else if (!title.trim()) { toast.error("Skriv en tittel først"); return }
    if (!targetChosen) { toast.error("Velg hvor innholdet skal vises (Vis på)"); return }
    if (targetMode === "stores" && storeIds.length === 0) { toast.error("Velg minst én butikk"); return }
    if (targetMode === "tags" && tagIds.length === 0) { toast.error("Velg minst én tagg"); return }
    // Tilbud/annonser MÅ ha både fra- og til-dato — de skal aldri gå evig.
    if (publish && periodRequired && (!validFrom || !validTo)) {
      toast.error("Tilbud må ha både fra- og til-dato")
      return
    }
    // Andre typer: myk bekreftelse ved publisering uten sluttdato.
    if (publish && !periodRequired && !validTo) { setConfirmNoEndDate(true); return }
    doSave(publish)
  }

  async function doSave(publish: boolean) {
    setSaving(true)
    const res = await saveContent(
      {
        title: isKlubb ? klubb.headline.trim() : isOfferStruktur ? offer.varenavn.trim() : title,
        type, audience, bodyHtml: usesBody ? bodyHtml : "", imageUrl: usesImage ? imageUrls[0] ?? null : null,
        imageUrls: usesImage ? imageUrls : [],
        offer: isOfferStruktur ? offer : null,
        klubb: isKlubb ? klubb : null,
        invitation: type === "invitation" ? invitation : null,
        gallery: type === "gallery" ? {
          ...gallery,
          // Ansattilbud-tema er kun internt — fall tilbake til catering på kundeskjerm.
          theme: audience !== "intern" && gallery.theme === "ansattilbud" ? "catering" : gallery.theme,
          items: gallery.items.filter((it) => it.name.trim() || it.imageUrl),
        } : null,
        avdeling: (type === "slide" || type === "competition") ? avdeling : null,
        // 2+ images always render full-page (side by side), so force plakat-style.
        imageMode: usesImage ? (type === "slide" || isMulti ? "plakat" : imageMode) : "bakgrunn",
        targetMode, storeIds, tagIds,
        validFrom: validFrom || null, validTo: validTo || null, publish,
        contactPerson: type === "job" ? contactPerson || null : null,
        applyUrl: (type === "job" || type === "competition" || type === "news") ? applyUrl || null : null,
        bgColor: usesColors ? bgColor || null : null,
        textColor: usesColors ? textColor || null : null,
        durationSeconds: durationSeconds ? Math.max(3, Math.min(600, Number(durationSeconds))) : null,
      },
      initial?.id
    )
    setSaving(false)
    if (res.ok) {
      if (draftKey) { try { localStorage.removeItem(draftKey) } catch {} }
      toast.success(publish ? "Publisert" : "Lagret som utkast")
      router.push(listHref)
    } else {
      toast.error(res.error ?? "Noe gikk galt")
    }
  }

  // Live preview payload — rendered by the real screen components in an iframe.
  const previewData = {
    type, audience,
    title: isKlubb ? klubb.headline : isOfferStruktur ? offer.varenavn : title,
    klubb: isKlubb ? klubb : null,
    bodyHtml: usesBody ? bodyHtml : "",
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    imageMode: (type === "slide" || isMulti ? "plakat" : imageMode) as ImageMode,
    offer: isOfferStruktur ? offer : null,
    invitation: type === "invitation" ? invitation : null,
    gallery: type === "gallery" ? gallery : null,
    avdeling,
    bgColor: usesColors ? bgColor || null : null,
    textColor: usesColors ? textColor || null : null,
    validFrom: validFrom || null,
    validTo: validTo || null,
    applyUrl: (type === "job" || type === "competition" || type === "news") ? applyUrl || null : null,
    contactPerson: type === "job" ? contactPerson || null : null,
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <div className="flex flex-col gap-2 px-4 py-2.5 bg-white border-b border-zinc-200 sticky top-0 z-10 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:h-14 sm:py-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={listHref} className="p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 shrink-0"><ChevronLeft className="w-4 h-4" /></Link>
          <h1 className="text-sm font-semibold text-zinc-900 truncate">{initial ? "Rediger innhold" : "Nytt innhold"}</h1>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Lagre utkast
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving} style={{ backgroundColor: "var(--brand-primary)" }}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Publiser
          </Button>
        </div>
      </div>

      {/* Type — first choice, full width on top */}
      {typeOptions.length > 1 && (
        <div className="px-6 pt-6 max-w-6xl w-full">
          <h3 className="text-xs font-semibold text-zinc-600 mb-2">Type</h3>
          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setType(key); if (key === "slide") setImageMode("plakat") }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${type === key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 pb-6 pt-4 sm:gap-6 sm:px-6 max-w-6xl">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {restored && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              <Save className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">Gjenopprettet et ulagret utkast.</span>
              <button type="button" onClick={discardDraft} className="font-semibold hover:underline">Forkast</button>
            </div>
          )}
          {!isOfferStruktur && !isKlubb && (
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "slide" ? "Tittel på plakaten..." : type === "gallery" ? "Overskrift på galleriet..." : "Tittel på saken..."}
                className="w-full text-2xl font-bold text-zinc-900 bg-transparent border-none focus:outline-none placeholder:text-zinc-300"
              />
            </div>
          )}

          {type === "ticker" && (
            <p className="text-xs text-zinc-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Tittelen er <strong>ticker-meldingen</strong> som ruller nederst på skjermen. Stripen vises kun når det finnes aktive ticker-meldinger.
            </p>
          )}

          {/* Offer authoring mode: structured price card vs uploaded poster */}
          {type === "slide" && (
            <div className="flex gap-1.5">
              {OFFER_MODES.map(({ k, label }) => (
                <button key={k} type="button" onClick={() => setOfferMode(k)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${offerMode === k ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {isOfferStruktur && (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                <label className="block text-[10px] text-zinc-400 mb-1">Hent fra spar.no (lim inn lenke eller GTIN)</label>
                <div className="flex gap-2">
                  <input value={gtinInput} onChange={(e) => setGtinInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doLookup() } }}
                    placeholder="https://spar.no/varer/… eller 54492653"
                    className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  <button type="button" onClick={doLookup} disabled={looking}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap" style={{ backgroundColor: "var(--brand-primary)" }}>
                    {looking ? "Henter…" : "Hent"}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Fyller varenavn, vareinfo, pris, enhetspris, pant og produktbilde automatisk.</p>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Varenavn *</label>
                <input value={offer.varenavn} onChange={(e) => setOffer((p) => ({ ...p, varenavn: e.target.value }))} placeholder="Reker 40/60"
                  className="w-full text-lg font-bold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Vareinfo</label>
                <input value={offer.vareinfo ?? ""} onChange={(e) => setOf("vareinfo", e.target.value)} placeholder="Kystfrost, fryst, 1 kg"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Merkelapp</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {BADGES.map((b) => (
                    <button key={b} type="button" onClick={() => setOffer((p) => ({ ...p, badge: p.badge === b ? null : b }))}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${offer.badge === b ? "border-red-600 bg-red-600 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                      {b}
                    </button>
                  ))}
                </div>
                <input value={offer.badge ?? ""} onChange={(e) => setOf("badge", e.target.value)} placeholder="…eller skriv egen merkelapp"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {OFFER_GRID.map(({ k, label, ph }) => (
                  <div key={k}>
                    <label className="block text-[10px] text-zinc-400 mb-1">{label}</label>
                    <input value={(offer[k] as string | null) ?? ""} onChange={(e) => setOf(k, e.target.value)} placeholder={ph}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  </div>
                ))}
                <label className="flex items-center gap-2 text-xs text-zinc-700 self-end pb-2">
                  <input type="checkbox" checked={offer.pant} onChange={(e) => setOffer((p) => ({ ...p, pant: e.target.checked }))} className="rounded border-zinc-300" />
                  + pant
                </label>
              </div>
              <p className="text-[10px] text-zinc-400">Bildet du laster opp under blir produktbildet på kortet.</p>
            </div>
          )}

          {isKlubb && (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-[11px] text-zinc-500 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                Kundeklubb-kort med <strong>QR-kode</strong> som tar kunden til butikkens egen påmeldingsside. QR-koden lages automatisk per butikk — du velger kun tekst og hvilke skjermer den vises på.
              </p>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Overskrift *</label>
                <input value={klubb.headline} onChange={(e) => setKlubb((p) => ({ ...p, headline: e.target.value }))} placeholder="Bli medlem – det er gratis"
                  className="w-full text-lg font-bold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Undertekst</label>
                <input value={klubb.subtext} onChange={(e) => setKlubb((p) => ({ ...p, subtext: e.target.value }))} placeholder="Medlemspriser, bonus og ukens beste tilbud."
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
            </div>
          )}

          {usesBody && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Innhold</label>
              <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
            </div>
          )}

          {usesImage && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Bilde / PDF</label>
              {imageUrls.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 max-w-md">
                    {imageUrls.map((url) => {
                      const lower = url.toLowerCase().split("?")[0]
                      const isPdf = lower.endsWith(".pdf")
                      const isVid = /\.(mp4|webm|mov|m4v)$/.test(lower)
                      return (
                        <div key={url} className="relative rounded-xl overflow-hidden border border-zinc-200 group">
                          {isPdf ? (
                            <div className="w-full h-36 flex items-center justify-center bg-zinc-900 text-white gap-2 text-sm font-semibold">
                              <FileText className="w-5 h-5" /> PDF
                            </div>
                          ) : isVid ? (
                            // eslint-disable-next-line jsx-a11y/media-has-caption
                            <video src={url} muted loop autoPlay playsInline className="w-full h-36 object-contain bg-zinc-900" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt="" className={`w-full h-36 ${isMulti || imageMode === "plakat" || imageMode === "liten" ? "object-contain bg-zinc-900" : "object-cover"}`} />
                          )}
                          <button onClick={() => removeImage(url)} aria-label="Fjern bilde" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Visningsvalg: kun relevant for ett enkelt bilde. */}
                  {!isPdfUrl && !isMulti && type !== "slide" && (
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">Bildevisning</label>
                      <div className="flex gap-1.5">
                        {([["bakgrunn", "Bakgrunn", ImageLucide], ["liten", "Lite bilde", PanelRight], ["plakat", "Plakat (vis hele)", Maximize2]] as const).map(([mode, label, Icon]) => (
                          <button key={mode} type="button" onClick={() => setImageMode(mode)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${imageMode === mode ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                            <Icon className="w-3 h-3" /> {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{imageMode === "plakat" ? "Hele bildet vises uten klipp — for ferdige plakater." : imageMode === "liten" ? "Lite bilde til høyre, teksten til venstre — teksten er hovedsaken." : "Bildet fyller kortet som dempet bakgrunn med tekst oppå."}</p>
                    </div>
                  )}
                  {isMulti && <p className="text-[10px] text-zinc-400">{imageUrls.length} bilder vises som <strong>helside, side om side</strong> — uten dempet bakgrunn.</p>}
                  {isPdfUrl && <p className="text-[10px] text-zinc-400">PDF vises i full størrelse (helside) på skjermen.</p>}

                  {canAddMore && (
                    <div className="max-w-md">
                      <MediaUploader maxFiles={MAX_IMAGES - imageUrls.length} accept={["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "video/mp4", "video/webm", "video/quicktime"]} onUpload={(files) => addImages(files.map((f) => f.url))} />
                    </div>
                  )}
                </div>
              ) : (
                <MediaUploader maxFiles={MAX_IMAGES} accept={["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf", "video/mp4", "video/webm", "video/quicktime"]} onUpload={(files) => addImages(files.map((f) => f.url))} />
              )}
            </div>
          )}

          {type === "competition" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><Trophy className="w-3.5 h-3.5" /> Konkurranse</h3>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Lenke for QR-kode (valgfri)</label>
                <input type="text" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="gangerolv.no/konkurranse"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                <p className="text-[10px] text-zinc-400 mt-1">Vises som QR-kode på skjermen så kundene kan delta direkte.</p>
              </div>
            </div>
          )}

          {type === "news" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><Globe className="w-3.5 h-3.5" /> Lenke / QR-kode</h3>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Lenke for QR-kode (valgfri)</label>
                <input type="text" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="gangerolvkjokkenet.no"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                <p className="text-[10px] text-zinc-400 mt-1">Vises som QR-kode nederst på artikkelen — kundene skanner for mer.</p>
              </div>
            </div>
          )}

          {type === "job" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><Briefcase className="w-3.5 h-3.5" /> Stillingsinfo</h3>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Kontaktperson</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Navn på kontaktperson"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Søknadslenke</label>
                <input type="text" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="gangerolv.no/stillinger"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
              </div>
            </div>
          )}

          {type === "invitation" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><Ticket className="w-3.5 h-3.5" /> Arrangement</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Dato og tid</label>
                  <input type="datetime-local" value={invitation.eventDate ?? ""} onChange={(e) => setInvitation((p) => ({ ...p, eventDate: e.target.value || null }))}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Sted</label>
                  <input type="text" value={invitation.eventPlace ?? ""} onChange={(e) => setInvitation((p) => ({ ...p, eventPlace: e.target.value || null }))} placeholder="Kantina, 2. etg."
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                <input type="checkbox" checked={invitation.signupEnabled} onChange={(e) => setInvitation((p) => ({ ...p, signupEnabled: e.target.checked }))} className="rounded border-zinc-300" />
                Vis QR-kode for påmelding på skjermen
              </label>
              {invitation.signupEnabled && (
                <>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Lenke for QR-kode (valgfri)</label>
                    <input type="text" value={invitation.signupUrl ?? ""} onChange={(e) => setInvitation((p) => ({ ...p, signupUrl: e.target.value || null }))} placeholder="gangerolv.no/julebord"
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {invitation.signupUrl?.trim()
                        ? "QR-koden peker til denne lenken."
                        : "Tom = QR-koden bruker den innebygde påmeldingssiden. Svarene ser du under Kampanjer → Invitasjoner."}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">Påmeldingsfrist (valgfri)</label>
                    <input type="date" value={invitation.signupDeadline ?? ""} onChange={(e) => setInvitation((p) => ({ ...p, signupDeadline: e.target.value || null }))}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  </div>
                </>
              )}
            </div>
          )}

          {type === "gallery" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 mb-2"><LayoutGrid className="w-3.5 h-3.5" /> Galleri</h3>
                <div className="flex gap-1.5">
                  {/* Ansattilbud er kun for interne skjermer — aldri på kundeskjerm. */}
                  {GALLERY_THEMES.filter((t) => audience === "intern" || t.k !== "ansattilbud").map(({ k, label }) => (
                    <button key={k} type="button" onClick={() => setGallery((p) => ({ ...p, theme: k }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${gallery.theme === k ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">Tittelen øverst blir <strong>overskriften</strong> på galleriet. Temaet styrer farger og merkelapp.</p>
              </div>

              <div className="space-y-3">
                {gallery.items.map((it, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Vare {i + 1}</span>
                      {gallery.items.length > 1 && (
                        <button type="button" onClick={() => setGallery((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}
                          className="text-zinc-400 hover:text-red-600" aria-label="Fjern vare"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    {it.imageUrl ? (
                      <div className="relative w-full max-w-[180px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.imageUrl} alt="" className="w-full h-28 object-cover rounded-lg border border-zinc-200" />
                        <button type="button" onClick={() => setGallery((p) => ({ ...p, items: p.items.map((x, idx) => idx === i ? { ...x, imageUrl: null } : x) }))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Fjern bilde"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="max-w-[260px]">
                        <MediaUploader maxFiles={1} accept={["image/jpeg", "image/png", "image/webp", "image/avif"]} onUpload={(files) => { const url = files[0]?.url; if (url) setGallery((p) => ({ ...p, items: p.items.map((x, idx) => idx === i ? { ...x, imageUrl: url } : x) })) }} />
                      </div>
                    )}
                    <input value={it.name} onChange={(e) => setGallery((p) => ({ ...p, items: p.items.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) }))} placeholder="Navn på rett/vare"
                      className="w-full text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={it.price ?? ""} onChange={(e) => setGallery((p) => ({ ...p, items: p.items.map((x, idx) => idx === i ? { ...x, price: e.target.value || null } : x) }))} placeholder="Pris (149,-)"
                        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                      <input value={it.priceInfo ?? ""} onChange={(e) => setGallery((p) => ({ ...p, items: p.items.map((x, idx) => idx === i ? { ...x, priceInfo: e.target.value || null } : x) }))} placeholder="Prisinfo (/pers)"
                        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setGallery((p) => ({ ...p, items: [...p.items, { name: "", price: null, priceInfo: null, imageUrl: null } as GalleryItem] }))}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 border border-dashed border-zinc-300 rounded-lg px-3 py-2 w-full justify-center">
                  <Plus className="w-3.5 h-3.5" /> Legg til vare
                </button>
              </div>

              <div className="border-t border-zinc-100 pt-3 space-y-2.5">
                <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600"><QrCode className="w-3.5 h-3.5" /> QR-kode (valgfri)</h4>
                <input value={gallery.qrUrl ?? ""} onChange={(e) => setGallery((p) => ({ ...p, qrUrl: e.target.value || null }))} placeholder="gangerolv.no/catering"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                <input value={gallery.qrLabel ?? ""} onChange={(e) => setGallery((p) => ({ ...p, qrLabel: e.target.value || null }))} placeholder="Tekst over QR (Bestill her)"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                <p className="text-[10px] text-zinc-400">Tom lenke = ingen QR-kode på galleriet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          {/* Universal live preview — exactly as it appears on the screen */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-zinc-600 mb-3">Forhåndsvisning</h3>
            {type === "ticker" ? (
              <p className="text-[11px] text-zinc-400">Ticker vises som en rullende stripe nederst på {audience === "kunde" ? "kundeskjermen" : "internskjermen"}.</p>
            ) : (
              <>
                <LivePreview data={previewData} portrait={audience === "kunde"} />
                <p className="text-[10px] text-zinc-400 mt-2.5 text-center">Live — slik vises det på {audience === "kunde" ? "kundeskjermen" : "internskjermen"}.{isOfferStruktur ? " Kjedelogo legges til per butikk." : ""}</p>
              </>
            )}
          </section>


          {/* Targeting */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Vis på</h3>
            <div className="flex gap-1.5 mb-3">
              {(([["all", "Alle", Globe], ["stores", unitLabelPlural, StoreIcon], ["tags", "Tagger", Tag]] as const)
                // Butikk-roller kan kun målrette egne butikker — skjul «Alle»/«Tagger».
                .filter(([mode]) => canTargetAll || mode === "stores")
              ).map(([mode, label, Icon]) => (
                <button key={mode} onClick={() => { setTargetMode(mode); setTargetChosen(true) }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${targetChosen && targetMode === mode ? "border-[var(--brand-primary)] bg-zinc-50 text-zinc-900" : "border-zinc-200 text-zinc-500"}`}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>

            {targetChosen ? (
              <>
                <p className={`text-[11px] font-medium mb-2 ${reach === 0 ? "text-red-500" : "text-emerald-600"}`}>
                  → Vises på {reach} av {stores.length} {unitLabelPlural.toLowerCase()}
                </p>
                {targetMode === "all" && <p className="text-[11px] text-zinc-400">Vises på alle {unitLabelPlural.toLowerCase()}s skjermer.</p>}
              </>
            ) : (
              <p className="text-[11px] font-medium mb-2 text-amber-600">Velg hvor innholdet skal vises før du publiserer.</p>
            )}

            {targetMode === "stores" && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} placeholder="Søk butikk…"
                      className="w-full text-xs border border-zinc-200 rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  </div>
                  {chains.length > 1 && (
                    <select value={chainF} onChange={(e) => setChainF(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                      <option value="">Alle kjeder</option>
                      {chains.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center justify-between px-1">
                  <button type="button" onClick={toggleAllVisible} className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900">
                    {allVisibleSelected ? "Fjern alle (synlige)" : "Velg alle (synlige)"}
                  </button>
                  {storeIds.length > 0 && <span className="text-[11px] text-zinc-400">{storeIds.length} valgt</span>}
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 -mx-1 px-1">
                  {visibleStores.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 px-2 py-2">Ingen butikker matcher.</p>
                  ) : visibleStores.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                      <input type="checkbox" checked={storeIds.includes(s.id)} onChange={() => toggleStore(s.id)} className="rounded border-zinc-300" />
                      <span className="text-xs text-zinc-700 flex-1 truncate">{s.name}</span>
                      {s.city && <span className="text-[11px] text-zinc-400">{s.city}</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {targetMode === "tags" && (
              <div className="space-y-1">
                {tags.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">Ingen tagger ennå. Lag tagger under Butikker.</p>
                ) : tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    <input type="checkbox" checked={tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} className="rounded border-zinc-300" />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color ?? "#a1a1aa" }} />
                    <span className="text-xs text-zinc-700">{t.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Avdeling — for alt som vises på kundeskjerm (tilbud + konkurranse) */}
          {(type === "slide" || type === "competition") && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Avdeling</h3>
              <select value={avdeling} onChange={(e) => setAvdeling(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                {AVDELINGER.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
              <p className="text-[10px] text-zinc-400 mt-1.5">Vises på skjermer i denne avdelingen. «Hele butikken» vises på alle kundeskjermer.</p>
            </section>
          )}

          {/* Appearance — background + text colour for text cards */}
          {usesColors && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Utseende</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COLOR_PRESETS.map((p) => {
                  const active = bgColor.toLowerCase() === p.bg && textColor.toLowerCase() === p.fg
                  return (
                    <button key={p.label} type="button" title={p.label} onClick={() => { setBgColor(p.bg); setTextColor(p.fg) }}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${active ? "border-zinc-900 scale-110" : "border-zinc-200"}`}
                      style={{ background: p.bg }}>
                      <span className="text-[10px] font-bold" style={{ color: p.fg }}>A</span>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Bakgrunn</label>
                  <input type="color" value={bgColor || "#0a0a0a"} onChange={(e) => setBgColor(e.target.value)} className="w-full h-9 rounded-lg border border-zinc-200 bg-white cursor-pointer" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Skriftfarge</label>
                  <input type="color" value={textColor || "#ffffff"} onChange={(e) => setTextColor(e.target.value)} className="w-full h-9 rounded-lg border border-zinc-200 bg-white cursor-pointer" />
                </div>
              </div>
              {(bgColor || textColor) && (
                <button type="button" onClick={() => { setBgColor(""); setTextColor("") }} className="text-[10px] text-zinc-400 hover:text-zinc-700 mt-2">Nullstill til standard (mørk)</button>
              )}
            </section>
          )}

          {/* Display time per item */}
          {type !== "ticker" && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Visningstid</h3>
              <div className="flex items-center gap-2">
                <input type="number" min={3} max={600} value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} placeholder={`${defaultDuration}`}
                  className="w-24 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                <span className="text-xs text-zinc-500">sekunder</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5">Hvor lenge dette vises før skjermen bytter. Tom = standard for denne typen (<strong>{defaultDuration} sek</strong>).</p>
            </section>
          )}

          {/* Period */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 mb-2.5"><Calendar className="w-3.5 h-3.5" /> Periode <span className={`font-normal ${periodRequired ? "text-red-500" : "text-zinc-400"}`}>{periodRequired ? "(påkrevd)" : "(valgfritt)"}</span></h3>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {([["Denne uka", () => campaignWeek(0)], ["Neste uke", () => campaignWeek(1)], ["Ut måneden", () => restOfMonth()]] as const).map(([label, range]) => (
                <button key={label} type="button" onClick={() => { const [f, t] = range(); setValidFrom(f); setValidTo(t) }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all">
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Fra{periodRequired && <span className="text-red-500"> *</span>}</label>
                <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={`w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none ${periodRequired && !validFrom ? "border-red-300" : "border-zinc-200"}`} />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Til{periodRequired && <span className="text-red-500"> *</span>}</label>
                <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={`w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none ${periodRequired && !validTo ? "border-red-300" : "border-zinc-200"}`} />
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={confirmNoEndDate} onOpenChange={setConfirmNoEndDate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto sm:mx-0 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-1">
              <CalendarOff className="h-5 w-5" />
            </div>
            <DialogTitle>Ingen sluttdato satt</DialogTitle>
            <DialogDescription>
              Dette innholdet har ingen sluttdato og vil vises på skjermen til du fjerner det manuelt.
              Er du sikker på at det ikke skal ha en sluttdato?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmNoEndDate(false)} disabled={saving}>
              Sett sluttdato
            </Button>
            <Button
              size="sm"
              onClick={() => { setConfirmNoEndDate(false); doSave(true) }}
              disabled={saving}
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Publiser likevel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
