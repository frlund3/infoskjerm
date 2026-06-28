"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { MediaUploader } from "@/components/admin/media-uploader"
import { Button } from "@/components/ui/button"
import { saveContent, type ContentType, type TargetMode } from "../actions"
import { toast } from "sonner"
import {
  Newspaper, Trophy, ImageIcon,
  Store as StoreIcon, Tag, Globe, X, Calendar, Save, Send, ChevronLeft,
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
  targetMode: TargetMode
  storeIds: string[]
  tagIds: string[]
  validFrom: string | null
  validTo: string | null
}

// Bare AUTHORED innhold her. Vær/klokke/salgstall er per-enhet-widgets
// i Xibo-malen, ikke noe man «publiserer».
const TYPES: { key: ContentType; label: string; icon: React.ElementType }[] = [
  { key: "news", label: "Nyhet", icon: Newspaper },
  { key: "competition", label: "Konkurranse", icon: Trophy },
  { key: "slide", label: "Tilbud / annet", icon: ImageIcon },
]

export function ContentForm({ stores, tags, initial }: { stores: StoreOption[]; tags: TagOption[]; initial?: ContentInitial }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<ContentType>(initial?.type ?? "news")
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "")
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [targetMode, setTargetMode] = useState<TargetMode>(initial?.targetMode ?? "all")
  const [storeIds, setStoreIds] = useState<string[]>(initial?.storeIds ?? [])
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "")
  const [validTo, setValidTo] = useState(initial?.validTo ?? "")
  const [saving, setSaving] = useState(false)

  const toggleStore = (id: string) => setStoreIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleTag = (id: string) => setTagIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function handleSave(publish: boolean) {
    if (!title.trim()) { toast.error("Skriv en tittel først"); return }
    if (targetMode === "stores" && storeIds.length === 0) { toast.error("Velg minst én butikk"); return }
    if (targetMode === "tags" && tagIds.length === 0) { toast.error("Velg minst én tagg"); return }
    setSaving(true)
    const res = await saveContent(
      { title, type, bodyHtml, imageUrl, targetMode, storeIds, tagIds, validFrom: validFrom || null, validTo: validTo || null, publish },
      initial?.id
    )
    setSaving(false)
    if (res.ok) {
      toast.success(publish ? "Publisert" : "Lagret som utkast")
      router.push("/admin/innhold")
    } else {
      toast.error(res.error ?? "Noe gikk galt")
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 h-14 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <Link href="/admin/innhold" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"><ChevronLeft className="w-4 h-4" /></Link>
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
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tittel på saken..."
              className="w-full text-2xl font-bold text-zinc-900 bg-transparent border-none focus:outline-none placeholder:text-zinc-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Innhold</label>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Bilde</label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 group w-full max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="w-full h-44 object-cover" />
                <button onClick={() => setImageUrl(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <MediaUploader maxFiles={1} onUpload={(files) => { if (files[0]) setImageUrl(files[0].url) }} />
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          {/* Type */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-zinc-600 mb-2.5">Type</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${type === key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </section>

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

          {/* Period */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 mb-2.5"><Calendar className="w-3.5 h-3.5" /> Periode <span className="font-normal text-zinc-400">(valgfritt)</span></h3>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Fra</label>
                <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Til</label>
                <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
