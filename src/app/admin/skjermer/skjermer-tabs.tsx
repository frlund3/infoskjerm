"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal, LayoutGrid } from "lucide-react"

/**
 * To faner på Skjermer-siden: «Skjerm-styring» (bind/tildel tilkoblede skjermer +
 * kiosk) og «Alle butikker · status» (fleet-helse for hele tenanten). Panelene er
 * server-rendret og sendes inn som props. Standardfane = styring (der du handler);
 * har ingen butikk skjermer ennå, vises status direkte uten faner.
 */

type Tab = "styring" | "status"

export function SkjermerTabs({
  styring, status, styringCount, statusCount,
}: {
  styring: ReactNode
  status: ReactNode
  styringCount: number
  statusCount: number
}) {
  const [tab, setTab] = useState<Tab>(styringCount > 0 ? "styring" : "status")

  const tabs: { key: Tab; label: string; count: number; icon: typeof SlidersHorizontal }[] = [
    { key: "styring", label: "Skjerm-styring", count: styringCount, icon: SlidersHorizontal },
    { key: "status", label: "Alle butikker · status", count: statusCount, icon: LayoutGrid },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                active
                  ? "border-[var(--brand-primary)] text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>{t.count}</span>
            </button>
          )
        })}
      </div>

      <div>{tab === "styring" ? styring : status}</div>
    </div>
  )
}
