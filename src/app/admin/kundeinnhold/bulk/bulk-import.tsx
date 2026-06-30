"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronLeft, Loader2, Send, Save, Trash2, CheckCircle2, AlertTriangle, Search, Globe, Store as StoreIcon, Tag, Sparkles } from "lucide-react"
import type { OfferFields, LiveItem } from "@/lib/content/live"
import { OfferCard } from "@/app/widget/tilbud/offer-card"
import { MediaUploader } from "@/components/admin/media-uploader"
import { bulkLookupSpar, bulkCreateOffers, type BulkShared } from "../bulk-actions"
import type { StoreOption, TagOption } from "../../innhold/_components/content-form"

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
const BADGES = ["", "TILBUD", "KNALLPRIS", "NYHET", "SUPERPRIS", "KAMPANJE"]
const OFFER_GRID: { k: keyof OfferFields; label: string; ph: string }[] = [
  { k: "pris", label: "Pris", ph: "39,90" },
  { k: "forpris", label: "Førpris", ph: "59,90" },
  { k: "rabatt", label: "Rabatt", ph: "-30 %" },
  { k: "enhetspris", label: "Enhetspris", ph: "kr 79,80/kg" },
  { k: "maks", label: "Maks per kunde", ph: "Maks 5" },
  { k: "tag", label: "Tag (valgfri)", ph: "Sommervibber" },
]

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
function week(offsetWeeks: number): [string, string] {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const mon = new Date(now); mon.setDate(now.getDate() - day + offsetWeeks * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return [iso(mon), iso(sun)]
}

type TargetMode = "all" | "stores" | "tags"
interface TargetValue { mode: TargetMode; storeIds: string[]; tagIds: string[] }

interface Row {
  id: string
  input: string
  status: "ok" | "failed"
  offer: OfferFields
  imageUrl: string | null
  avdeling: string
  validFrom?: string | null
  validTo?: string | null
  /** Per-row visibility override; null = inherit the shared "Vis på". */
  target?: TargetValue | null
}

const EMPTY_OFFER: OfferFields = { varenavn: "", vareinfo: null, badge: null, pris: null, rabatt: null, forpris: null, tag: null, enhetspris: null, maks: null, pant: false }

function toLiveItem(offer: OfferFields, imageUrl: string | null, validFrom: string | null, validTo: string | null): LiveItem {
  return {
    id: "p", type: "slide", title: offer.varenavn || "", blocks: [], imageUrl, imageUrls: imageUrl ? [imageUrl] : [],
    imageMode: "plakat", isPdf: false, isVideo: false, durationSeconds: null, pages: [], validFrom, validTo,
    author: "", date: "", contactPerson: null, applyUrl: null, statsValue: null, statsChange: null,
    offer, avdeling: "felles", bgColor: null, textColor: null, klubb: null, invitation: null, gallery: null,
  }
}

const inputCls = "w-full text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"

function reachCount(v: TargetValue, stores: StoreOption[]): number {
  if (v.mode === "all") return stores.length
  if (v.mode === "stores") return v.storeIds.length
  const hit = new Set<string>()
  for (const s of stores) if ((s.tagIds ?? []).some((t) => v.tagIds.includes(t))) hit.add(s.id)
  return hit.size
}

function TargetPicker({ value, onChange, stores, tags }: { value: TargetValue; onChange: (v: TargetValue) => void; stores: StoreOption[]; tags: TagOption[] }) {
  const [search, setSearch] = useState("")
  const visible = stores.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.city ?? "").toLowerCase().includes(search.toLowerCase()))
  const reach = reachCount(value, stores)
  const toggleStore = (sid: string) => onChange({ ...value, storeIds: value.storeIds.includes(sid) ? value.storeIds.filter((x) => x !== sid) : [...value.storeIds, sid] })
  const toggleTag = (tid: string) => onChange({ ...value, tagIds: value.tagIds.includes(tid) ? value.tagIds.filter((x) => x !== tid) : [...value.tagIds, tid] })
  return (
    <>
      <div className="flex gap-1.5 mb-2">
        {([["all", "Alle", Globe], ["stores", "Butikker", StoreIcon], ["tags", "Tagger", Tag]] as const).map(([m, l, Icon]) => (
          <button key={m} type="button" onClick={() => onChange({ ...value, mode: m })} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border ${value.mode === m ? "border-zinc-900 bg-zinc-50 text-zinc-900" : "border-zinc-200 text-zinc-500"}`}><Icon className="w-3 h-3" /> {l}</button>
        ))}
      </div>
      <p className={`text-[11px] font-medium ${reach === 0 ? "text-red-500" : "text-emerald-600"}`}>→ {reach} av {stores.length} butikker</p>
      {value.mode === "stores" && (
        <div className="mt-2">
          <div className="relative mb-1"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk butikk…" className="w-full text-xs border border-zinc-200 rounded-lg pl-7 pr-2 py-1.5" /></div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {visible.map((s) => (
              <label key={s.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-zinc-50 cursor-pointer">
                <input type="checkbox" checked={value.storeIds.includes(s.id)} onChange={() => toggleStore(s.id)} className="rounded border-zinc-300" />
                <span className="text-xs text-zinc-700 truncate">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {value.mode === "tags" && (
        <div className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
          {tags.map((t) => (
            <label key={t.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-zinc-50 cursor-pointer">
              <input type="checkbox" checked={value.tagIds.includes(t.id)} onChange={() => toggleTag(t.id)} className="rounded border-zinc-300" />
              <span className="text-xs text-zinc-700">{t.name}</span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

export function BulkImport({ stores, tags }: { stores: StoreOption[]; tags: TagOption[] }) {
  const router = useRouter()
  const [raw, setRaw] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)

  // Shared defaults applied to all.
  const [validFrom, setValidFrom] = useState("")
  const [validTo, setValidTo] = useState("")
  const [targetMode, setTargetMode] = useState<TargetMode>("all")
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [defAvdeling, setDefAvdeling] = useState("felles")
  const [defBadge, setDefBadge] = useState("")

  const setWeek = (o: number) => { const [f, t] = week(o); setValidFrom(f); setValidTo(t) }
  // "Standard"-feltene gjelder alle: endring brukes retroaktivt på allerede limte rader.
  const applyDefAvdeling = (v: string) => { setDefAvdeling(v); setRows((prev) => prev.map((r) => ({ ...r, avdeling: v }))) }
  const applyDefBadge = (v: string) => { setDefBadge(v); setRows((prev) => prev.map((r) => ({ ...r, offer: { ...r.offer, badge: v || null } }))) }

  async function handleLookup() {
    const lines = raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    if (lines.length === 0) { toast.error("Lim inn minst én lenke eller GTIN"); return }
    setLoading(true)
    const res = await bulkLookupSpar(lines)
    setLoading(false)
    const newRows: Row[] = res.map((r, i) => {
      const p = r.product
      const offer: OfferFields = p
        ? { ...EMPTY_OFFER, varenavn: p.varenavn ?? "", vareinfo: p.vareinfo, badge: defBadge || null, pris: p.pris, forpris: p.pris, enhetspris: p.enhetspris, pant: p.pant }
        : { ...EMPTY_OFFER, badge: defBadge || null }
      return { id: `${Date.now()}-${i}`, input: r.input, status: r.ok ? "ok" : "failed", offer, imageUrl: p?.imageUrl ?? null, avdeling: defAvdeling }
    })
    setRows((prev) => [...prev, ...newRows])
    setRaw("")
    setFocusId(newRows[0]?.id ?? focusId)
    const okN = newRows.filter((r) => r.status === "ok").length
    toast.success(`Hentet ${okN} av ${newRows.length}`)
  }

  const updateOffer = (id: string, patch: Partial<OfferFields>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, offer: { ...r.offer, ...patch }, status: "ok" } : r)))
  const setOf = (id: string, k: keyof OfferFields, v: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, offer: { ...r.offer, [k]: v.trim() || null }, status: "ok" } : r)))
  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id))

  const ready = rows.filter((r) => r.offer.varenavn.trim())

  async function save(publish: boolean) {
    if (ready.length === 0) { toast.error("Ingen varer med varenavn å lagre"); return }
    if (publish && (!validFrom || !validTo)) { toast.error("Sett fra- og til-dato før publisering"); return }
    if (targetMode === "stores" && storeIds.length === 0) { toast.error("Velg minst én butikk"); return }
    if (targetMode === "tags" && tagIds.length === 0) { toast.error("Velg minst én tagg"); return }
    const emptyOverride = ready.find((r) => r.target && r.target.mode !== "all" && (r.target.mode === "stores" ? r.target.storeIds.length === 0 : r.target.tagIds.length === 0))
    if (emptyOverride) { toast.error(`«${emptyOverride.offer.varenavn}» har egen synlighet uten valgt butikk/tagg`); return }
    setSaving(true)
    const shared: BulkShared = { validFrom: validFrom || null, validTo: validTo || null, targetMode, storeIds, tagIds }
    const res = await bulkCreateOffers(ready.map((r) => ({ offer: r.offer, imageUrl: r.imageUrl, avdeling: r.avdeling, validFrom: r.validFrom ?? null, validTo: r.validTo ?? null, targetMode: r.target?.mode ?? null, storeIds: r.target?.storeIds ?? null, tagIds: r.target?.tagIds ?? null })), shared, publish)
    setSaving(false)
    if (res.ok) {
      toast.success(`${res.created} tilbud ${publish ? "publisert" : "lagret som utkast"}${res.failed ? ` · ${res.failed} feilet` : ""}`)
      router.push("/admin/kundeinnhold")
    } else toast.error("Noe gikk galt")
  }

  const focused = rows.find((r) => r.id === focusId) ?? null

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 h-14 bg-white border-b border-zinc-200 sticky top-0 z-10">
        <Link href="/admin/kundeinnhold" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"><ChevronLeft className="w-4 h-4" /></Link>
        <h1 className="text-sm font-semibold text-zinc-900">Masseimport tilbud</h1>
        {rows.length > 0 && <span className="text-xs text-zinc-400">{ready.length} klare · {rows.filter((r) => r.status === "failed" && !r.offer.varenavn.trim()).length} mangler</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => save(false)} disabled={saving || rows.length === 0} className="flex items-center gap-1.5 text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 hover:border-zinc-300 disabled:opacity-50"><Save className="w-3.5 h-3.5" /> Lagre utkast</button>
          <button onClick={() => save(true)} disabled={saving || rows.length === 0} className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Publiser alle ({ready.length})
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-5 max-w-6xl w-full">
        {/* Paste box */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-xs font-semibold text-zinc-600 mb-2">Lim inn spar.no-lenker eller GTIN — én per linje</h3>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={4} placeholder={"https://spar.no/varer/...\n7039610001234\nhttps://spar.no/varer/..."} className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-300" />
          <button onClick={handleLookup} disabled={loading} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3.5 py-2 disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Hent alle
          </button>
        </section>

        {/* Shared defaults */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-zinc-600 mb-2">Periode (alle)</h3>
            <div className="flex gap-1.5 mb-2">
              {([["Denne uka", 0], ["Neste uke", 1]] as const).map(([l, o]) => (
                <button key={l} onClick={() => setWeek(o)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-200 text-zinc-600 hover:border-zinc-900">{l}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5" />
              <span className="text-zinc-400 text-xs">→</span>
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-600 mb-2">Standard avdeling + merkelapp (alle)</h3>
            <select value={defAvdeling} onChange={(e) => applyDefAvdeling(e.target.value)} className={inputCls + " mb-2"}>
              {AVDELINGER.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
            <select value={defBadge} onChange={(e) => applyDefBadge(e.target.value)} className={inputCls}>
              {BADGES.map((b) => <option key={b} value={b}>{b || "Ingen merkelapp"}</option>)}
            </select>
            <p className="text-[10px] text-zinc-400 mt-1.5">Endres på alle varer — juster enkeltvis i listen/panelet etterpå.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-600 mb-2">Vis på (alle)</h3>
            <TargetPicker
              value={{ mode: targetMode, storeIds, tagIds }}
              onChange={(v) => { setTargetMode(v.mode); setStoreIds(v.storeIds); setTagIds(v.tagIds) }}
              stores={stores}
              tags={tags}
            />
          </div>
        </section>

        {/* Review: table (left) + big preview (right) */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2 w-8"></th>
                    <th className="text-left font-semibold px-3 py-2">Varenavn</th>
                    <th className="text-left font-semibold px-3 py-2 w-24">Pris</th>
                    <th className="text-left font-semibold px-3 py-2 w-36">Avdeling</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => setFocusId(r.id)} className={`cursor-pointer ${focusId === r.id ? "bg-zinc-50" : "hover:bg-zinc-50/60"}`}>
                      <td className="px-3 py-2">{r.offer.varenavn.trim() ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}</td>
                      <td className="px-3 py-2">
                        <input value={r.offer.varenavn} onChange={(e) => updateOffer(r.id, { varenavn: e.target.value })} onClick={(e) => e.stopPropagation()} placeholder={r.status === "failed" ? `Ikke funnet (${r.input}) — fyll inn` : "Varenavn"} className={inputCls + (r.offer.varenavn.trim() ? "" : " border-amber-300")} />
                      </td>
                      <td className="px-3 py-2"><input value={r.offer.pris ?? ""} onChange={(e) => updateOffer(r.id, { pris: e.target.value || null })} onClick={(e) => e.stopPropagation()} placeholder="39,90" className={inputCls} /></td>
                      <td className="px-3 py-2">
                        <select value={r.avdeling} onChange={(e) => updateRow(r.id, { avdeling: e.target.value })} onClick={(e) => e.stopPropagation()} className={inputCls}>
                          {AVDELINGER.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2"><button onClick={(e) => { e.stopPropagation(); removeRow(r.id) }} aria-label="Fjern" className="text-zinc-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Focused preview + full fields */}
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 sticky top-20">
                <h3 className="text-xs font-semibold text-zinc-600 mb-3">Forhåndsvisning</h3>
                {focused ? (
                  <>
                    <div className="mx-auto rounded-xl overflow-hidden border border-zinc-200 shadow-sm" style={{ position: "relative", width: "100%", maxWidth: 220, aspectRatio: "9 / 16" }}>
                      <OfferCard item={toLiveItem(focused.offer, focused.imageUrl, validFrom || null, validTo || null)} chain={null} />
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-zinc-400">{focused.imageUrl ? "Bytt produktbilde" : "Last opp eget produktbilde"}</label>
                        {focused.imageUrl && <button type="button" onClick={() => updateRow(focused.id, { imageUrl: null })} className="text-[10px] text-zinc-400 hover:text-red-500">Fjern bilde</button>}
                      </div>
                      <MediaUploader maxFiles={1} accept={["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]} onUpload={(files) => { if (files[0]) updateRow(focused.id, { imageUrl: files[0].url }) }} />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Vareinfo</label>
                        <input value={focused.offer.vareinfo ?? ""} onChange={(e) => updateOffer(focused.id, { vareinfo: e.target.value || null })} placeholder="Kystfrost, fryst, 1 kg" className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {OFFER_GRID.map(({ k, label, ph }) => (
                          <div key={k}>
                            <label className="block text-[10px] text-zinc-400 mb-1">{label}</label>
                            <input value={(focused.offer[k] as string | null) ?? ""} onChange={(e) => setOf(focused.id, k, e.target.value)} placeholder={ph} className={inputCls} />
                          </div>
                        ))}
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Merkelapp</label>
                          <select value={focused.offer.badge ?? ""} onChange={(e) => updateOffer(focused.id, { badge: e.target.value || null })} className={inputCls}>
                            {BADGES.map((b) => <option key={b} value={b}>{b || "Ingen merkelapp"}</option>)}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-zinc-700 self-end pb-2"><input type="checkbox" checked={focused.offer.pant} onChange={(e) => updateOffer(focused.id, { pant: e.target.checked })} className="rounded border-zinc-300" /> + pant</label>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <p className="text-[10px] text-zinc-400 mb-1.5">Egen periode for denne (valgfri — ellers brukes felles)</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={focused.validFrom ?? ""} onChange={(e) => updateRow(focused.id, { validFrom: e.target.value || null })} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5" />
                        <span className="text-zinc-400 text-xs">→</span>
                        <input type="date" value={focused.validTo ?? ""} onChange={(e) => updateRow(focused.id, { validTo: e.target.value || null })} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5" />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <label className="flex items-center justify-between gap-2 mb-1.5 cursor-pointer">
                        <span className="text-[10px] text-zinc-400">Egen synlighet for denne (ellers brukes felles)</span>
                        <input
                          type="checkbox"
                          checked={!!focused.target}
                          onChange={(e) => updateRow(focused.id, { target: e.target.checked ? { mode: targetMode, storeIds: [...storeIds], tagIds: [...tagIds] } : null })}
                          className="rounded border-zinc-300"
                        />
                      </label>
                      {focused.target && (
                        <TargetPicker value={focused.target} onChange={(v) => updateRow(focused.id, { target: v })} stores={stores} tags={tags} />
                      )}
                    </div>
                  </>
                ) : <p className="text-xs text-zinc-400">Velg en rad for å redigere og forhåndsvise.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
