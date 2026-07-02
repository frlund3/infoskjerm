"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Check, Tag as TagIcon, Pencil, ArrowLeft, Trash2 } from "lucide-react"
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
  onUpdate: (tag: BoardTag) => Promise<{ ok: boolean; error?: string }>
  onDelete: (tagId: string) => Promise<{ ok: boolean; error?: string }>
}

export function TagPopover({
  assigned,
  allTags,
  open,
  onOpenChange,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
}: TagPopoverProps) {
  const [query, setQuery] = useState("")
  const [color, setColor] = useState(PALETTE[0])
  const [busy, setBusy] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [editing, setEditing] = useState<BoardTag | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState(PALETTE[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const assignedIds = new Set(assigned.map((t) => t.id))

  // Open upward when there isn't enough room below the trigger.
  useEffect(() => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropUp(window.innerHeight - rect.bottom < 320)
  }, [open])

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

  // Nullstill redigeringsmodus når popoveren lukkes — samme
  // "adjust state while rendering"-mønster som i stores-board.
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (!open) {
      setEditing(null)
      setConfirmDelete(false)
      setEditError(null)
    }
  }

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

  function startEdit(tag: BoardTag) {
    setEditing(tag)
    setEditName(tag.name)
    setEditColor(tag.color)
    setConfirmDelete(false)
    setEditError(null)
  }

  function closeEdit() {
    setEditing(null)
    setConfirmDelete(false)
    setEditError(null)
  }

  async function handleUpdate() {
    if (!editing || busy) return
    const name = editName.trim()
    if (!name) return
    setBusy(true)
    setEditError(null)
    const res = await onUpdate({ id: editing.id, name, color: editColor })
    setBusy(false)
    if (res.ok) closeEdit()
    else setEditError(res.error ?? "Noe gikk galt")
  }

  async function handleDelete() {
    if (!editing || busy) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setBusy(true)
    setEditError(null)
    const res = await onDelete(editing.id)
    setBusy(false)
    if (res.ok) closeEdit()
    else {
      setConfirmDelete(false)
      setEditError(res.error ?? "Noe gikk galt")
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
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
        <div
          className={cn(
            "absolute right-0 z-50 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ring-1 ring-black/5",
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {editing ? (
            <div>
              <div className="flex items-center gap-2 border-b border-zinc-100 p-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  aria-label="Tilbake"
                  className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-semibold text-zinc-700">Rediger tag</span>
              </div>

              <div className="space-y-2.5 p-2.5">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate()
                  }}
                  placeholder="Tag-navn"
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
                />

                <div className="flex items-center gap-1.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      aria-label={`Farge ${c}`}
                      className={cn(
                        "h-4 w-4 rounded-full transition-transform hover:scale-110",
                        editColor === c && "ring-2 ring-zinc-900 ring-offset-1"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {editError && <p className="text-xs text-red-600">{editError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={busy || editName.trim().length === 0}
                    className="flex-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Lagre
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                      confirmDelete
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {confirmDelete ? "Sikker?" : "Slett"}
                  </button>
                </div>

                <p className="text-[11px] leading-snug text-zinc-400">
                  Endringer gjelder alle enheter som har taggen.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                    <div
                      key={tag.id}
                      className="group/row flex w-full items-center rounded-lg transition-colors hover:bg-zinc-50"
                    >
                      <button
                        type="button"
                        onClick={() => onToggle(tag, !isOn)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
                      >
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 truncate text-zinc-700">{tag.name}</span>
                        {isOn && <Check className="h-3.5 w-3.5 flex-shrink-0 text-zinc-900" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        aria-label={`Rediger tag ${tag.name}`}
                        className="mr-1 flex-shrink-0 rounded-md p-1 text-zinc-400 opacity-0 transition-all hover:bg-zinc-200/60 hover:text-zinc-700 focus-visible:opacity-100 group-hover/row:opacity-100"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
