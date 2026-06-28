"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Check, Tag as TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BoardTag } from "./types"
import { withAlpha } from "./types"

const PALETTE = [
  "#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
]

interface TagPopoverProps {
  assigned: BoardTag[]
  allTags: BoardTag[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (tag: BoardTag, assign: boolean) => void
  onCreate: (name: string, color: string) => Promise<{ ok: boolean; error?: string }>
}

export function TagPopover({
  assigned,
  allTags,
  open,
  onOpenChange,
  onToggle,
  onCreate,
}: TagPopoverProps) {
  const [query, setQuery] = useState("")
  const [color, setColor] = useState(PALETTE[0])
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const assignedIds = new Set(assigned.map((t) => t.id))

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onOpenChange])

  const needle = query.trim().toLowerCase()
  const filtered = allTags.filter((t) => t.name.toLowerCase().includes(needle))
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === needle)
  const canCreate = needle.length > 0 && !exactMatch

  async function handleCreate() {
    const name = query.trim()
    if (!name || busy) return
    setBusy(true)
    const res = await onCreate(name, color)
    setBusy(false)
    if (res.ok) setQuery("")
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500",
          "transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700",
          open && "border-zinc-400 bg-zinc-50 text-zinc-700"
        )}
      >
        <Plus className="h-3 w-3" />
        Tag
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5">
          <div className="border-b border-zinc-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) handleCreate()
              }}
              placeholder="Søk eller lag ny tag…"
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && !canCreate && (
              <p className="px-2 py-3 text-center text-xs text-zinc-400">Ingen tags ennå</p>
            )}

            {filtered.map((tag) => {
              const isOn = assignedIds.has(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggle(tag, !isOn)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-zinc-50"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 truncate text-zinc-700">{tag.name}</span>
                  {isOn && <Check className="h-3.5 w-3.5 flex-shrink-0 text-zinc-900" />}
                </button>
              )
            })}
          </div>

          {canCreate && (
            <div className="border-t border-zinc-100 p-2">
              <div className="mb-2 flex items-center gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Farge ${c}`}
                    className={cn(
                      "h-4 w-4 rounded-full transition-transform hover:scale-110",
                      color === c && "ring-2 ring-zinc-900 ring-offset-1"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50"
                style={{ color }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md"
                  style={{ backgroundColor: withAlpha(color, "1f") }}
                >
                  <TagIcon className="h-3 w-3" />
                </span>
                <span className="truncate text-zinc-700">
                  Lag «<span className="font-semibold">{query.trim()}</span>»
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
