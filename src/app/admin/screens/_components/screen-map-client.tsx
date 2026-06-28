"use client"

import { useState, useMemo } from "react"
import { useScreenStatuses } from "@/lib/realtime/screens"
import { ScreenCard } from "./screen-card"
import { ScreenSlideOver } from "./screen-slide-over"
import { ScreenBulkBar } from "./screen-bulk-bar"
import { Grid3X3, List, Search } from "lucide-react"

interface ScreenRow {
  id: string
  name: string
  status: string | null
  last_heartbeat: string | null
  last_seen_at: string | null
  pending_command: string | null
  power_state: string
  app_info: string | null
  stores: {
    name: string
    chains: { name: string; color: string } | null
  } | null
}

interface ScreenMapClientProps {
  screens: ScreenRow[]
}

export function ScreenMapClient({ screens: initialScreens }: ScreenMapClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [filterChain, setFilterChain] = useState<string>("all")

  // Live Realtime updates — get statuses map
  const statuses = useScreenStatuses(
    initialScreens.map((s) => ({ id: s.id, status: s.status, last_heartbeat: s.last_heartbeat }))
  )

  // Merge static data with live statuses
  const screens = useMemo(
    () =>
      initialScreens.map((s) => {
        const live = statuses.get(s.id)
        return {
          ...s,
          status: live?.status ?? s.status,
          last_heartbeat: live?.last_heartbeat ?? s.last_heartbeat,
        }
      }),
    [initialScreens, statuses]
  )

  // Chain list for filter
  const chains = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of initialScreens) {
      if (s.stores?.chains) map.set(s.stores.chains.name, s.stores.chains.color)
    }
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }))
  }, [initialScreens])

  // Filter
  const filtered = useMemo(() => {
    let result = screens
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.stores?.name ?? "").toLowerCase().includes(q)
      )
    }
    if (filterChain !== "all") {
      result = result.filter((s) => s.stores?.chains?.name === filterChain)
    }
    return result
  }, [screens, search, filterChain])

  const activeScreen = activeScreenId ? screens.find((s) => s.id === activeScreenId) ?? null : null

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((s) => s.id))
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Søk etter skjerm eller butikk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>

        {/* Chain filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterChain("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterChain === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Alle
          </button>
          {chains.map((c) => (
            <button
              key={c.name}
              onClick={() => setFilterChain(filterChain === c.name ? "all" : c.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterChain === c.name ? "text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
              style={filterChain === c.name ? { backgroundColor: c.color } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Select all */}
        <button
          onClick={toggleSelectAll}
          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {selectedIds.length === filtered.length && filtered.length > 0 ? "Fjern alle" : "Velg alle"}
        </button>

        {/* View toggle */}
        <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${
              viewMode === "grid" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${
              viewMode === "list" ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      <ScreenBulkBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="font-medium">Ingen skjermer funnet</p>
          <p className="text-sm mt-1">Prøv et annet søk eller filter</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((screen) => {
            const storeData = screen.stores
            return (
              <ScreenCard
                key={screen.id}
                screen={{
                  id: screen.id,
                  name: screen.name,
                  status: screen.status,
                  last_heartbeat: screen.last_heartbeat,
                  last_seen_at: screen.last_seen_at,
                  store_name: storeData?.name ?? "—",
                  store_chain_color: storeData?.chains?.color ?? "#888",
                  pending_command: screen.pending_command,
                  power_state: screen.power_state,
                  app_info: screen.app_info,
                }}
                isSelected={selectedIds.includes(screen.id)}
                onClick={() => setActiveScreenId(screen.id === activeScreenId ? null : screen.id)}
                onSelect={(e) => toggleSelect(screen.id, e)}
              />
            )
          })}
        </div>
      ) : (
        // List view
        <div className="space-y-1.5">
          {filtered.map((screen) => {
            const storeData = screen.stores
            const chainColor = storeData?.chains?.color ?? "#888"
            const isOnline =
              screen.last_heartbeat !== null &&
              Date.now() - new Date(screen.last_heartbeat).getTime() < 30_000
            const isMaintenance = screen.status === "maintenance"
            return (
              <div
                key={screen.id}
                onClick={() => setActiveScreenId(screen.id === activeScreenId ? null : screen.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  selectedIds.includes(screen.id)
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-100 bg-white hover:border-zinc-200"
                }`}
              >
                <div
                  onClick={(e) => toggleSelect(screen.id, e)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedIds.includes(screen.id)
                      ? "bg-zinc-900 border-zinc-900"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  {selectedIds.includes(screen.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="relative">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isMaintenance ? "bg-zinc-400" : isOnline ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  {isOnline && !isMaintenance && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  )}
                </div>
                <div className="w-2 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: chainColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{screen.name}</p>
                  <p className="text-xs text-zinc-500">{storeData?.name ?? "—"}</p>
                </div>
                <div className="text-xs text-zinc-400">
                  {screen.last_heartbeat
                    ? (() => {
                        const diff = Math.floor(
                          (Date.now() - new Date(screen.last_heartbeat).getTime()) / 1000
                        )
                        if (diff < 60) return `${diff}s`
                        if (diff < 3600) return `${Math.floor(diff / 60)}m`
                        return `${Math.floor(diff / 3600)}t`
                      })()
                    : "aldri"}
                </div>
                {screen.pending_command && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {screen.pending_command}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over */}
      {activeScreen && (
        <ScreenSlideOver
          screen={{
            id: activeScreen.id,
            name: activeScreen.name,
            status: activeScreen.status,
            last_heartbeat: activeScreen.last_heartbeat,
            last_seen_at: activeScreen.last_seen_at,
            store_name: activeScreen.stores?.name ?? "—",
            store_chain_name: activeScreen.stores?.chains?.name ?? "—",
            store_chain_color: activeScreen.stores?.chains?.color ?? "#888",
            pending_command: activeScreen.pending_command,
            power_state: activeScreen.power_state,
            app_info: activeScreen.app_info,
          }}
          onClose={() => setActiveScreenId(null)}
        />
      )}
    </>
  )
}
