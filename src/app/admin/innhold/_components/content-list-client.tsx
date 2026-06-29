"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteContent, duplicateContent, bulkSetStatus, bulkDeleteContent, bulkShiftPeriod } from "../actions"
import { toast } from "sonner"
import {
  Newspaper, Trophy, ImageIcon, Briefcase, PartyPopper, BarChart3, Megaphone, Globe, Store as StoreIcon, Tag,
  Copy, Trash2, Pencil, MoreVertical, Calendar, CalendarPlus, Search, ChevronLeft, ChevronRight, FileText,
  Send, EyeOff, X, Check,
} from "lucide-react"

export interface ContentRow {
  id: string
  title: string
  type: string
  status: string | null
  imageUrl: string | null
  validFrom: string | null
  validTo: string | null
  updatedAt: string | null
  target: { mode: "all" | "stores" | "tags" | "none"; count: number; names: string[] }
  storeIds: string[]
  tagIds: string[]
}

interface Option { id: string; name: string }

const TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string; gradient: string }> = {
  news: { label: "Nyhet", icon: Newspaper, badge: "bg-blue-600 text-white", gradient: "from-blue-500 to-blue-700" },
  competition: { label: "Konkurranse", icon: Trophy, badge: "bg-amber-500 text-white", gradient: "from-amber-400 to-amber-600" },
  slide: { label: "Tilbud", icon: ImageIcon, badge: "bg-zinc-700 text-white", gradient: "from-zinc-600 to-zinc-800" },
  job: { label: "Stilling", icon: Briefcase, badge: "bg-indigo-600 text-white", gradient: "from-indigo-500 to-indigo-700" },
  birthday: { label: "Gratulerer", icon: PartyPopper, badge: "bg-pink-500 text-white", gradient: "from-pink-400 to-pink-600" },
  stats: { label: "Salgstall", icon: BarChart3, badge: "bg-emerald-600 text-white", gradient: "from-emerald-500 to-emerald-700" },
  weather: { label: "Vær", icon: ImageIcon, badge: "bg-sky-500 text-white", gradient: "from-sky-400 to-sky-600" },
  ticker: { label: "Ticker", icon: Megaphone, badge: "bg-orange-500 text-white", gradient: "from-orange-400 to-orange-600" },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-white/90 text-zinc-600 ring-1 ring-zinc-200" },
  live: { label: "Publisert", color: "bg-emerald-500 text-white" },
  scheduled: { label: "Planlagt", color: "bg-cyan-500 text-white" },
  archived: { label: "Arkivert", color: "bg-zinc-400 text-white" },
}

function targetIcon(mode: ContentRow["target"]["mode"]) {
  if (mode === "tags") return Tag
  if (mode === "stores") return StoreIcon
  return Globe
}

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `Fra ${fmt(from)}`
  return `Til ${fmt(to!)}`
}

const PAGE_SIZE = 12

const selectCls = "text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-2 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300"

export function ContentListClient({ items, stores, tags, newHref = "/admin/innhold/ny" }: { items: ContentRow[]; stores: Option[]; tags: Option[]; newHref?: string }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusF, setStatusF] = useState("all")
  const [typeF, setTypeF] = useState("")
  const [storeF, setStoreF] = useState("")
  const [tagF, setTagF] = useState("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  function closeMenu() { setMenuId(null); setConfirmId(null) }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function runBulk(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBulkBusy(true)
    const res = await fn()
    setBulkBusy(false)
    if (res.ok) { toast.success(okMsg); setSelected(new Set()); router.refresh() }
    else toast.error(res.error ?? "Feil")
  }

  async function handleDuplicate(id: string, shiftDays = 0) {
    setBusyId(id); closeMenu()
    const res = await duplicateContent(id, shiftDays)
    setBusyId(null)
    if (res.ok) { toast.success(shiftDays > 0 ? "Kopiert til neste uke (utkast)" : "Kopiert"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  async function handleDelete(id: string) {
    setBusyId(id); closeMenu()
    const res = await deleteContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Slettet"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (search && !it.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusF !== "all" && (it.status ?? "draft") !== statusF) return false
      if (typeF && it.type !== typeF) return false
      // "Alle butikker"-innhold (target_all) treffer ethvert butikk-/tag-filter,
      // siden det faktisk vises på alle butikker.
      if (storeF && it.target.mode !== "all" && !it.storeIds.includes(storeF)) return false
      if (tagF && it.target.mode !== "all" && !it.tagIds.includes(tagF)) return false
      return true
    })
  }, [items, search, statusF, typeF, storeF, tagF])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(0) }
  }

  const hasFilters = search || statusF !== "all" || typeF || storeF || tagF

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Søk i tittel..."
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            className="w-full text-sm bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
        </div>
        <select value={statusF} onChange={(e) => resetPage(setStatusF)(e.target.value)} className={selectCls}>
          <option value="all">Alle statuser</option>
          <option value="live">Publisert</option>
          <option value="draft">Utkast</option>
          <option value="scheduled">Planlagt</option>
          <option value="archived">Arkivert</option>
        </select>
        <select value={typeF} onChange={(e) => resetPage(setTypeF)(e.target.value)} className={selectCls}>
          <option value="">Alle typer</option>
          <option value="news">Nyhet</option>
          <option value="competition">Konkurranse</option>
          <option value="slide">Tilbud / annet</option>
          <option value="job">Stilling</option>
          <option value="birthday">Gratulerer</option>
          <option value="ticker">Ticker</option>
        </select>
        <select value={storeF} onChange={(e) => resetPage(setStoreF)(e.target.value)} className={selectCls}>
          <option value="">Alle butikker</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={tagF} onChange={(e) => resetPage(setTagF)(e.target.value)} className={selectCls}>
          <option value="">Alle tagger</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusF("all"); setTypeF(""); setStoreF(""); setTagF(""); setPage(0) }} className="text-xs text-zinc-400 hover:text-zinc-700 px-2">Nullstill</button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs text-zinc-400">{filtered.length} treff</p>
        {visible.length > 0 && (
          <button
            onClick={() => {
              const ids = visible.map((v) => v.id)
              const allSel = ids.every((id) => selected.has(id))
              setSelected((prev) => {
                const next = new Set(prev)
                ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)))
                return next
              })
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium"
          >
            {visible.every((v) => selected.has(v.id)) ? "Fjern valg på siden" : "Velg alle på siden"}
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-zinc-900 text-white px-3 py-2 shadow-lg">
          <span className="text-xs font-semibold pl-1">{selected.size} valgt</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button disabled={bulkBusy} onClick={() => runBulk(() => bulkSetStatus([...selected], true), "Publisert")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Publiser</button>
            <button disabled={bulkBusy} onClick={() => runBulk(() => bulkSetStatus([...selected], false), "Avpublisert")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50"><EyeOff className="w-3.5 h-3.5" /> Avpubliser</button>
            <button disabled={bulkBusy} onClick={() => runBulk(() => bulkShiftPeriod([...selected], 7), "Forlenget +7 dager")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50"><CalendarPlus className="w-3.5 h-3.5" /> Forleng +7d</button>
            <button disabled={bulkBusy} onClick={() => runBulk(() => bulkDeleteContent([...selected]), "Slettet")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Slett</button>
            <button disabled={bulkBusy} onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Avbryt valg"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Newspaper className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">{hasFilters ? "Ingen treff" : "Ingen innhold ennå"}</p>
          {!hasFilters && (
            <Link href={newHref} className="inline-block mt-4 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>+ Nytt innhold</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((item) => {
            const tm = TYPE_META[item.type] ?? TYPE_META.slide
            const sm = STATUS_META[item.status ?? "draft"] ?? STATUS_META.draft
            const TypeIcon = tm.icon
            const TargetIcon = targetIcon(item.target.mode)
            const period = formatPeriod(item.validFrom, item.validTo)
            const targetText = item.target.mode === "all" ? "Alle butikker"
              : item.target.mode === "none" ? "Ikke målrettet"
              : item.target.names.slice(0, 2).join(", ") + (item.target.names.length > 2 ? ` +${item.target.names.length - 2}` : "")
            return (
              <div key={item.id} className={`group relative rounded-2xl bg-white border overflow-hidden hover:shadow-lg transition-all ${selected.has(item.id) ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300"} ${busyId === item.id ? "opacity-50" : ""}`}>
                <button
                  onClick={() => toggleSelect(item.id)}
                  aria-label={selected.has(item.id) ? "Fjern fra valg" : "Velg"}
                  aria-pressed={selected.has(item.id)}
                  className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${selected.has(item.id) ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white/85 border-zinc-300 text-transparent opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <Link href={`/admin/innhold/${item.id}`} className="block relative aspect-[16/9] overflow-hidden">
                  {item.imageUrl && (item.imageUrl).toLowerCase().split("?")[0].endsWith(".pdf") ? (
                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-1.5 text-white/70">
                      <FileText className="w-9 h-9" />
                      <span className="text-[11px] font-semibold tracking-wide">PDF</span>
                    </div>
                  ) : item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="w-full h-full object-contain bg-zinc-50 p-1" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${tm.gradient} flex items-center justify-center`}>
                      <TypeIcon className="w-10 h-10 text-white/40" />
                    </div>
                  )}
                  <span className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${tm.badge} shadow-sm`}>
                    <TypeIcon className="w-3 h-3" /> {tm.label}
                  </span>
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full ${sm.color} shadow-sm`}>{sm.label}</span>
                </Link>

                <div className="p-3.5">
                  <Link href={`/admin/innhold/${item.id}`}>
                    <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug hover:text-zinc-600">{item.title || "Uten tittel"}</h3>
                  </Link>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 min-w-0"><TargetIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">{targetText}</span></span>
                    {period && <span className="flex items-center gap-1 flex-shrink-0"><Calendar className="w-3 h-3" />{period}</span>}
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5">
                  <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} aria-label="Handlinger" aria-haspopup="menu" className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 bg-white/80 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={closeMenu} />
                      <div className="absolute right-0 bottom-9 z-20 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
                        <Link href={`/admin/innhold/${item.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Pencil className="w-3.5 h-3.5" /> Rediger</Link>
                        <button onClick={() => handleDuplicate(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Copy className="w-3.5 h-3.5" /> Dupliser</button>
                        <button onClick={() => handleDuplicate(item.id, 7)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><CalendarPlus className="w-3.5 h-3.5" /> Kopier til neste uke</button>
                        {confirmId === item.id ? (
                          <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700"><Trash2 className="w-3.5 h-3.5" /> Bekreft sletting</button>
                        ) : (
                          <button onClick={() => setConfirmId(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Slett</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500">Side {current + 1} av {pageCount}</span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={current >= pageCount - 1} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
