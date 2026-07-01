"use client"

import { useMemo, useState } from "react"
import { LogIn, FilePlus, FileEdit, Send, EyeOff, Trash2, Copy, CalendarPlus, UserPlus, Shield, Store, Tag, Palette, Monitor, Search, Activity } from "lucide-react"

export interface LogRow {
  id: string
  created_at: string
  user_email: string | null
  action: string
  entity_type: string | null
  summary: string
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  "auth.login": { label: "Innlogging", icon: LogIn, cls: "bg-sky-50 text-sky-700" },
  "content.create": { label: "Opprettet", icon: FilePlus, cls: "bg-zinc-100 text-zinc-700" },
  "content.update": { label: "Endret", icon: FileEdit, cls: "bg-amber-50 text-amber-700" },
  "content.publish": { label: "Publisert", icon: Send, cls: "bg-emerald-50 text-emerald-700" },
  "content.unpublish": { label: "Avpublisert", icon: EyeOff, cls: "bg-zinc-100 text-zinc-600" },
  "content.delete": { label: "Slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "content.duplicate": { label: "Kopiert", icon: Copy, cls: "bg-zinc-100 text-zinc-700" },
  "content.extend": { label: "Forlenget", icon: CalendarPlus, cls: "bg-amber-50 text-amber-700" },
  "user.invite": { label: "Invitert", icon: UserPlus, cls: "bg-indigo-50 text-indigo-700" },
  "user.delete": { label: "Bruker slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "user.role": { label: "Rolle endret", icon: Shield, cls: "bg-indigo-50 text-indigo-700" },
  "user.stores": { label: "Tilgang endret", icon: Shield, cls: "bg-indigo-50 text-indigo-700" },
  "store.create": { label: "Butikk opprettet", icon: Store, cls: "bg-zinc-100 text-zinc-700" },
  "store.delete": { label: "Butikk slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "tag.create": { label: "Tagg opprettet", icon: Tag, cls: "bg-zinc-100 text-zinc-700" },
  "settings.branding": { label: "Merkevare", icon: Palette, cls: "bg-fuchsia-50 text-fuchsia-700" },
  "settings.logo": { label: "Logo", icon: Palette, cls: "bg-fuchsia-50 text-fuchsia-700" },
  "screen.create": { label: "Skjerm opprettet", icon: Monitor, cls: "bg-zinc-100 text-zinc-700" },
  "screen.delete": { label: "Skjerm slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "screen.token": { label: "Ny token", icon: Monitor, cls: "bg-zinc-100 text-zinc-700" },
}

function metaFor(action: string) {
  return ACTION_META[action] ?? { label: action, icon: Activity, cls: "bg-zinc-100 text-zinc-600" }
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "nå nettopp"
  if (min < 60) return `${min} min siden`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} t siden`
  return d.toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

const ENTITY_FILTERS = [
  { key: "", label: "Alt" },
  { key: "content", label: "Innhold" },
  { key: "auth", label: "Innlogging" },
  { key: "user", label: "Brukere" },
  { key: "store", label: "Butikker" },
  { key: "chain", label: "Merkevare" },
  { key: "screen", label: "Skjermer" },
]

export function LoggClient({ rows }: { rows: LogRow[] }) {
  const [search, setSearch] = useState("")
  const [entity, setEntity] = useState("")

  const filtered = useMemo(() => rows.filter((r) => {
    if (entity && r.entity_type !== entity) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.summary.toLowerCase().includes(q) && !(r.user_email ?? "").toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, entity])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk i logg…"
            className="w-full text-sm bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENTITY_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setEntity(f.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${entity === f.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Activity className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">Ingen loggføringer ennå</p>
        </div>
      ) : (
        <ul className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
          {filtered.map((r) => {
            const m = metaFor(r.action)
            const Icon = m.icon
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${m.cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800 truncate">{r.summary}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{r.user_email ?? "System"} · {m.label}</p>
                </div>
                <span className="text-[11px] text-zinc-400 flex-shrink-0 whitespace-nowrap">{relTime(r.created_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-[11px] text-zinc-400">Viser de siste {rows.length} hendelsene.</p>
    </div>
  )
}
