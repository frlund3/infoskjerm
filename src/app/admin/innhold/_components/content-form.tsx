"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { MediaUploader } from "@/components/admin/media-uploader"
import { Button } from "@/components/ui/button"
import { saveContent, type ContentType, type TargetMode, type ImageMode, type Audience } from "../actions"
import { lookupSparProduct } from "../spar-actions"
import type { OfferFields } from "@/lib/content/live"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Newspaper, Trophy, ImageIcon, Briefcase, PartyPopper, Megaphone, FileText,
  Store as StoreIcon, Tag, Globe, X, Calendar, Save, Send, ChevronLeft, Image as ImageLucide, Maximize2, PanelRight, CalendarOff,
} from "lucide-react"
import Link from "next/link"

export interface StoreOption { id: string; name: string; chain: string | null; city: string | null }
export interface TagOption { id: string; name: string; color: string | null }

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
}

const EMPTY_OFFER: OfferFields = {
  varenavn: "", vareinfo: null, badge: null, pris: null, rabatt: null, forpris: null,
  mengde: null, enhetspris: null, maks: null, pant: false,
}

const BADGES = ["TILBUD", "KNALLPRIS", "NYHET", "SUPERPRIS", "KAMPANJE"]

// Departments an offer can be shown in. "felles" = whole store (all screens).
const AVDELINGER: { key: string; label: string }[] = [
  { key: "felles", label: "Hele butikken" },
  { key: "frukt", label: "Frukt & grønt" },
  { key: "ferskvare", label: "Ferskvare" },
  { key: "frys", label: "Frys" },
  { key: "bakeri", label: "Bakeri" },
  { key: "kjott-fisk", label: "Kjøtt & fisk" },
  { key: "kasse", label: "Kasse" },
  { key: "inngang", label: "Inngang" },
]

const OFFER_GRID: { k: keyof OfferFields; label: string; ph: string }[] = [
  { k: "pris", label: "Pris", ph: "39,90" },
  { k: "forpris", label: "Førpris", ph: "59,90" },
  { k: "rabatt", label: "Rabatt", ph: "-30 %" },
  { k: "mengde", label: "Mengde", ph: "2 for 50" },
  { k: "enhetspris", label: "Enhetspris", ph: "kr 79,80/kg" },
  { k: "maks", label: "Maks per kunde", ph: "Maks 5" },
]

const TYPES: { key: ContentType; label: string; icon: React.ElementType }[] = [
  { key: "news", label: "Nyhet", icon: Newspaper },
  { key: "competition", label: "Konkurranse", icon: Trophy },
  { key: "slide", label: "Tilbud / annet", icon: ImageIcon },
  { key: "job", label: "Stilling", icon: Briefcase },
  { key: "birthday", label: "Gratulerer", icon: PartyPopper },
  { key: "ticker", label: "Ticker", icon: Megaphone },
]

const IMAGE_TYPES: ContentType[] = ["news", "competition", "slide", "job", "birthday"]

// Which content types belong to each audience/menu.
const AUDIENCE_TYPES: Record<Audience, ContentType[]> = {
  kunde: ["slide"],
  // Internt kan også vise tilbud/plakat (f.eks. ukens tilbud til betjeningen).
  intern: ["news", "competition", "job", "birthday", "ticker", "slide"],
}

export function ContentForm({ stores, tags, initial, audience = "intern" }: { stores: StoreOption[]; tags: TagOption[]; initial?: ContentInitial; audience?: Audience }) {
  const router = useRouter()
  const allowedTypes = AUDIENCE_TYPES[audience]
  const typeOptions = TYPES.filter((t) => allowedTypes.includes(t.key))
  const listHref = audience === "kunde" ? "/admin/kundeinnhold" : "/admin/innhold"
  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<ContentType>(initial?.type ?? allowedTypes[0])
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "")
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.imageUrls?.length ? initial.imageUrls : initial?.imageUrl ? [initial.imageUrl] : [])
  const [targetMode, setTargetMode] = useState<TargetMode>(initial?.targetMode ?? "all")
  const [storeIds, setStoreIds] = useState<string[]>(initial?.storeIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "")
  const [validTo, setValidTo] = useState(initial?.validTo ?? "")
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "")
  const [applyUrl, setApplyUrl] = useState(initial?.applyUrl ?? "")
  const [imageMode, setImageMode] = useState<ImageMode>(initial?.imageMode ?? "bakgrunn")
  const [offerMode, setOfferMode] = useState<"struktur" | "plakat">(initial?.offer ? "struktur" : "plakat")
  const [offer, setOffer] = useState<OfferFields>(initial?.offer ?? EMPTY_OFFER)
  const [avdeling, setAvdeling] = useState(initial?.avdeling ?? "felles")
  const [saving, setSaving] = useState(false)
  const [confirmNoEndDate, setConfirmNoEndDate] = useState(false)

  const isOfferStruktur = type === "slide" && offerMode === "struktur"
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
      pris: p.pris ?? prev.pris,
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

  const usesImage = IMAGE_TYPES.includes(type)
  const usesBody = type !== "ticker" && !isOfferStruktur
  // Tilbud/annonser må alltid ha en gyldig periode (fra + til).
  const periodRequired = type === "slide"
  const isPdfUrl = (imageUrls[0] ?? "").toLowerCase().split("?")[0].endsWith(".pdf")
  const MAX_IMAGES = 4
  const isMulti = imageUrls.length >= 2
  const canAddMore = !isPdfUrl && imageUrls.length < MAX_IMAGES
  const addImages = (urls: string[]) => setImageUrls((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))
  const removeImage = (url: string) => setImageUrls((prev) => prev.filter((u) => u !== url))

  const toggleStore = (id: string) => setStoreIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleTag = (id: string) => setTagIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  function handleSave(publish: boolean) {
    if (isOfferStruktur) {
      if (!offer.varenavn.trim()) { toast.error("Skriv et varenavn"); return }
    } else if (!title.trim()) { toast.error("Skriv en tittel først"); return }
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
        title: isOfferStruktur ? offer.varenavn.trim() : title,
        type, audience, bodyHtml: usesBody ? bodyHtml : "", imageUrl: usesImage ? imageUrls[0] ?? null : null,
        imageUrls: usesImage ? imageUrls : [],
        offer: isOfferStruktur ? offer : null,
        avdeling: type === "slide" ? avdeling : null,
        // 2+ images always render full-page (side by side), so force plakat-style.
        imageMode: usesImage ? (type === "slide" || isMulti ? "plakat" : imageMode) : "bakgrunn",
        targetMode, storeIds, tagIds,
        validFrom: validFrom || null, validTo: validTo || null, publish,
        contactPerson: type === "job" ? contactPerson || null : null,
        applyUrl: type === "job" ? applyUrl || null : null,
      },
      initial?.id
    )
    setSaving(false)
    if (res.ok) {
      toast.success(publish ? "Publisert" : "Lagret som utkast")
      router.push(listHref)
    } else {
      toast.error(res.error ?? "Noe gikk galt")
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 h-14 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <Link href={listHref} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"><ChevronLeft className="w-4 h-4" /></Link>
        <h1 className="text-sm font-semibold text-zinc-900">{initial ? "Rediger innhold" : "Nytt innhold"}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Lagre utkast
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving} style={{ backgroundColor: "var(--brand-primary)" }}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Publiser
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-6xl">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {!isOfferStruktur && (
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "slide" ? "Tittel på plakaten..." : "Tittel på saken..."}
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
              {([["struktur", "Bygg tilbudskort"], ["plakat", "Last opp plakat / PDF"]] as const).map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setOfferMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${offerMode === mode ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
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
                      const isPdf = url.toLowerCase().split("?")[0].endsWith(".pdf")
                      return (
                        <div key={url} className="relative rounded-xl overflow-hidden border border-zinc-200 group">
                          {isPdf ? (
                            <div className="w-full h-36 flex items-center justify-center bg-zinc-900 text-white gap-2 text-sm font-semibold">
                              <FileText className="w-5 h-5" /> PDF
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt="" className={`w-full h-36 ${isMulti || imageMode === "plakat" || imageMode === "liten" ? "object-contain bg-zinc-900" : "object-cover"}`} />
                          )}
                          <button onClick={() => removeImage(url)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <MediaUploader maxFiles={MAX_IMAGES - imageUrls.length} accept={["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]} onUpload={(files) => addImages(files.map((f) => f.url))} />
                    </div>
                  )}
                </div>
              ) : (
                <MediaUploader maxFiles={MAX_IMAGES} accept={["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf"]} onUpload={(files) => addImages(files.map((f) => f.url))} />
              )}
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
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          {/* Type — only show a selector when the audience has more than one type */}
          {typeOptions.length > 1 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Type</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {typeOptions.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => { setType(key); if (key === "slide") setImageMode("plakat") }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${type === key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Targeting */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Vis på</h3>
            <div className="flex gap-1.5 mb-3">
              {([["all", "Alle", Globe], ["stores", "Butikker", StoreIcon], ["tags", "Tagger", Tag]] as const).map(([mode, label, Icon]) => (
                <button key={mode} onClick={() => setTargetMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${targetMode === mode ? "border-[var(--brand-primary)] bg-zinc-50 text-zinc-900" : "border-zinc-200 text-zinc-500"}`}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>

            {targetMode === "all" && <p className="text-[11px] text-zinc-400">Vises på alle butikkers skjermer.</p>}

            {targetMode === "stores" && (
              <div className="max-h-56 overflow-y-auto space-y-0.5 -mx-1 px-1">
                {stores.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    <input type="checkbox" checked={storeIds.includes(s.id)} onChange={() => toggleStore(s.id)} className="rounded border-zinc-300" />
                    <span className="text-xs text-zinc-700 flex-1 truncate">{s.name}</span>
                    {s.city && <span className="text-[10px] text-zinc-400">{s.city}</span>}
                  </label>
                ))}
                {storeIds.length > 0 && <p className="text-[10px] text-zinc-400 px-2 pt-1">{storeIds.length} valgt</p>}
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

          {/* Avdeling — kun for kundeannonser (tilbud) */}
          {type === "slide" && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Avdeling</h3>
              <select value={avdeling} onChange={(e) => setAvdeling(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300">
                {AVDELINGER.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
              <p className="text-[10px] text-zinc-400 mt-1.5">Vises på skjermer i denne avdelingen. «Hele butikken» vises på alle kundeskjermer.</p>
            </section>
          )}

          {/* Period */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 mb-2.5"><Calendar className="w-3.5 h-3.5" /> Periode <span className={`font-normal ${periodRequired ? "text-red-500" : "text-zinc-400"}`}>{periodRequired ? "(påkrevd)" : "(valgfritt)"}</span></h3>
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
