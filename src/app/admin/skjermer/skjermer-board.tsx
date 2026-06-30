"use client"

import { useState } from "react"
import Link from "next/link"
import type { StoreScreen, ScreenRole } from "@/lib/xibo/screens"

export interface BoardStore {
  id: string
  name: string
  chainName: string
  chainColor: string
  screens: StoreScreen[]
}

type Filter = "alle" | ScreenRole

const ROLE_CHIP: Record<ScreenRole, string> = {
  kunde: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  bakrom: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  avdeling: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "kunde", label: "Kunde" },
  { key: "bakrom", label: "Bakrom" },
  { key: "avdeling", label: "Avdeling" },
]

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" && value > 0 ? "text-amber-600" : "text-zinc-900"
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

export function SkjermerBoard({ stores }: { stores: BoardStore[] }) {
  const [filter, setFilter] = useState<Filter>("alle")

  const all = stores.flatMap((s) => s.screens)
  const online = all.filter((s) => s.online).length
  const count = (f: Filter) => (f === "alle" ? all.length : all.filter((s) => s.role === f).length)

  const ordered = stores
    .map((s) => ({ ...s, shown: s.screens.filter((sc) => filter === "alle" || sc.role === filter) }))
    .filter((s) => filter === "alle" || s.shown.length > 0)
    .sort((a, b) => {
      if ((a.shown.length > 0) !== (b.shown.length > 0)) return b.shown.length - a.shown.length
      return a.name.localeCompare(b.name, "nb")
    })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Skjermer totalt" value={all.length} />
        <Stat label="Pålogget" value={online} tone="ok" />
        <Stat label="Frakoblet" value={all.length - online} tone="warn" />
        <Stat label="Butikker m/ skjerm" value={stores.filter((s) => s.screens.length > 0).length} />
      </div>

      <div className="inline-flex rounded-xl border border-zinc-200 p-1 bg-zinc-50">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
          >
            {f.label} <span className={filter === f.key ? "text-white/60" : "text-zinc-400"}>{count(f.key)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((store) => (
          <div key={store.id} className="rounded-2xl border border-zinc-100 bg-white overflow-hidden flex flex-col">
            <Link
              href={`/admin/stores/${store.id}`}
              className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-900 truncate leading-tight">{store.name}</h3>
                <p className="text-[11px] text-zinc-400 truncate">{store.chainName}</p>
              </div>
              <span className="ml-auto text-xs text-zinc-400 flex-shrink-0">
                {store.shown.length} skjerm{store.shown.length !== 1 ? "er" : ""}
              </span>
            </Link>

            <div className="p-3 space-y-2 flex-1">
              {store.shown.length === 0 ? (
                <p className="text-sm text-zinc-400 italic px-2 py-4 text-center">Ingen skjerm tilkoblet ennå</p>
              ) : (
                store.shown.map((sc) => (
                  <div key={sc.displayId} className="flex items-start gap-3 rounded-xl bg-zinc-50/70 px-3 py-2.5">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${sc.online ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-zinc-300"}`}
                      title={sc.online ? "Pålogget" : "Frakoblet"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-800 truncate">{sc.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_CHIP[sc.role]}`}>{sc.roleLabel}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {sc.online ? "Pålogget" : "Frakoblet"} · sist sett {sc.lastSeen ?? "aldri"}
                      </p>
                      {sc.currentLayout && <p className="text-[11px] text-zinc-400 truncate">Viser: {sc.currentLayout}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
