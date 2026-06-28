"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteContent, duplicateContent } from "../actions"
import { toast } from "sonner"
import {
  Newspaper, Trophy, BarChart2, CloudSun, ImageIcon,
  Globe, Store as StoreIcon, Tag, Copy, Trash2, Pencil, MoreVertical,
} from "lucide-react"

export interface ContentRow {
  id: string
  title: string
  type: string
  status: string | null
  validFrom: string | null
  validTo: string | null
  updatedAt: string | null
  target: { mode: "all" | "stores" | "tags" | "none"; count: number }
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  news: { label: "Nyhet", icon: Newspaper, color: "bg-blue-50 text-blue-700" },
  competition: { label: "Konkurranse", icon: Trophy, color: "bg-amber-50 text-amber-700" },
  slide: { label: "Tilbud/annet", icon: ImageIcon, color: "bg-zinc-100 text-zinc-600" },
  stats: { label: "Salgstall", icon: BarChart2, color: "bg-emerald-50 text-emerald-700" },
  weather: { label: "Vær", icon: CloudSun, color: "bg-sky-50 text-sky-700" },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-zinc-100 text-zinc-500" },
  live: { label: "Publisert", color: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Planlagt", color: "bg-cyan-100 text-cyan-700" },
  archived: { label: "Arkivert", color: "bg-zinc-100 text-zinc-400" },
}

function targetLabel(t: ContentRow["target"]) {
  if (t.mode === "all") return { icon: Globe, text: "Alle butikker" }
  if (t.mode === "stores") return { icon: StoreIcon, text: `${t.count} butikk${t.count === 1 ? "" : "er"}` }
  if (t.mode === "tags") return { icon: Tag, text: `${t.count} tagg${t.count === 1 ? "" : "er"}` }
  return { icon: Globe, text: "Ikke målrettet" }
}

export function ContentListClient({ items }: { items: ContentRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  async function handleDuplicate(id: string) {
    setBusyId(id); setMenuId(null)
    const res = await duplicateContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Kopiert"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette dette innholdet?")) return
    setBusyId(id); setMenuId(null)
    const res = await deleteContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Slettet"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <Newspaper className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-700">Ingen innhold ennå</p>
        <p className="text-xs text-zinc-400 mt-1">Lag din første nyhet, tilbud eller konkurranse.</p>
        <Link href="/admin/innhold/ny" className="inline-block mt-4 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
          + Nytt innhold
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const tm = TYPE_META[item.type] ?? TYPE_META.slide
        const sm = STATUS_META[item.status ?? "draft"] ?? STATUS_META.draft
        const tl = targetLabel(item.target)
        const TypeIcon = tm.icon
        const TargetIcon = tl.icon
        return (
          <div key={item.id} className={`group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors ${busyId === item.id ? "opacity-50" : ""}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tm.color}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <Link href={`/admin/innhold/${item.id}`} className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{item.title || "Uten tittel"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-zinc-400">{tm.label}</span>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-1 text-[11px] text-zinc-400"><TargetIcon className="w-3 h-3" />{tl.text}</span>
              </div>
            </Link>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>

            <div className="relative">
              <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuId === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                  <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
                    <Link href={`/admin/innhold/${item.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Pencil className="w-3.5 h-3.5" /> Rediger</Link>
                    <button onClick={() => handleDuplicate(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Copy className="w-3.5 h-3.5" /> Dupliser</button>
                    <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Slett</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
