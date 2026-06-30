"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Store as StoreIcon, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { StoreCard } from "./store-card"
import { toggleStoreTag, createTag } from "../actions"
import type { BoardChain, BoardTag } from "./types"
import { withAlpha } from "./types"

interface StoresBoardProps {
  chains: BoardChain[]
  allTags: BoardTag[]
}

function buildTagMap(chains: BoardChain[]): Record<string, BoardTag[]> {
  const map: Record<string, BoardTag[]> = {}
  for (const chain of chains) {
    for (const store of chain.stores) {
      map[store.id] = store.tags
    }
  }
  return map
}

export function StoresBoard({ chains, allTags }: StoresBoardProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set())
  const [activeChain, setActiveChain] = useState<string>("all")

  // Optimistic, local-first tag state so assigning feels instant.
  const [tagsByStore, setTagsByStore] = useState<Record<string, BoardTag[]>>(() => buildTagMap(chains))
  const [tags, setTags] = useState<BoardTag[]>(allTags)

  // Resync with server truth after a revalidation/refresh — the recommended
  // "adjust state while rendering" pattern instead of an effect.
  const [serverSnapshot, setServerSnapshot] = useState({ chains, allTags })
  if (serverSnapshot.chains !== chains || serverSnapshot.allTags !== allTags) {
    setServerSnapshot({ chains, allTags })
    setTagsByStore(buildTagMap(chains))
    setTags(allTags)
  }

  function handleToggleTag(storeId: string, tag: BoardTag, assign: boolean) {
    setTagsByStore((prev) => {
      const current = prev[storeId] ?? []
      const next = assign
        ? [...current.filter((t) => t.id !== tag.id), tag]
        : current.filter((t) => t.id !== tag.id)
      return { ...prev, [storeId]: next }
    })
    startTransition(async () => {
      const res = await toggleStoreTag(storeId, tag.id, assign)
      router.refresh()
      if (!res.ok) console.error("Kunne ikke oppdatere tag:", res.error)
    })
  }

  async function handleCreateTag(storeId: string, name: string, color: string) {
    const res = await createTag(name, color)
    if (res.ok) {
      setTags((prev) =>
        [...prev, res.tag].sort((a, b) => a.name.localeCompare(b.name, "nb"))
      )
      handleToggleTag(storeId, res.tag, true)
      return { ok: true }
    }
    return { ok: false, error: res.error }
  }

  function toggleTagFilter(tagId: string) {
    setActiveTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const chainFilters = useMemo(
    () => chains.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    [chains]
  )

  const filteredChains = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chains
      .map((chain) => {
        if (activeChain !== "all" && chain.id !== activeChain) {
          return { ...chain, stores: [] }
        }
        const stores = chain.stores.filter((store) => {
          const storeTags = tagsByStore[store.id] ?? store.tags
          if (activeTagIds.size > 0 && !storeTags.some((t) => activeTagIds.has(t.id))) {
            return false
          }
          if (!q) return true
          return [store.name, store.company_name, store.city, store.org_number, store.email].some(
            (v) => v?.toLowerCase().includes(q)
          )
        })
        return { ...chain, stores }
      })
      .filter((c) => c.stores.length > 0)
  }, [chains, search, activeTagIds, activeChain, tagsByStore])

  const visibleCount = filteredChains.reduce((sum, c) => sum + c.stores.length, 0)
  const hasFilters = search.trim() !== "" || activeTagIds.size > 0 || activeChain !== "all"

  function clearFilters() {
    setSearch("")
    setActiveTagIds(new Set())
    setActiveChain("all")
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søk på navn, selskap, by, org.nr eller e-post…"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-9 text-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Chain segmented control */}
            <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
              <SegmentButton active={activeChain === "all"} onClick={() => setActiveChain("all")}>
                Alle
              </SegmentButton>
              {chainFilters.map((chain) => (
                <SegmentButton
                  key={chain.id}
                  active={activeChain === chain.id}
                  color={chain.color}
                  onClick={() => setActiveChain(chain.id)}
                >
                  {chain.name}
                </SegmentButton>
              ))}
            </div>
          </div>

          {/* Tag filter row */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {tags.map((tag) => {
                  const active = activeTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagFilter(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                        active
                          ? "border-transparent text-white shadow-sm"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      )}
                      style={active ? { backgroundColor: tag.color } : undefined}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: active ? "#ffffff" : tag.color }}
                      />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Result summary */}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>
              Viser <strong className="text-zinc-700">{visibleCount}</strong> enhet
              {visibleCount !== 1 ? "er" : ""}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Nullstill filtre
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {visibleCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
            <StoreIcon className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">
            {hasFilters
              ? "Ingen enheter matcher filtrene dine."
              : "Ingen enheter er lagt til ennå."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Nullstill filtre
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-8 p-4 sm:p-6">
          {filteredChains.map((chain) => (
            <section key={chain.id}>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: chain.color }} />
                <h2 className="text-lg font-bold tracking-tight text-zinc-900">{chain.name}</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: withAlpha(chain.color, "1a"),
                    color: chain.color,
                  }}
                >
                  {chain.stores.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {chain.stores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    chainName={chain.name}
                    chainColor={chain.color}
                    tags={tagsByStore[store.id] ?? store.tags}
                    allTags={tags}
                    onToggleTag={(tag, assign) => handleToggleTag(store.id, tag, assign)}
                    onCreateTag={(name, color) => handleCreateTag(store.id, name, color)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
      )}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      {children}
    </button>
  )
}
