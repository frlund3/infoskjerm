"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { reorderContent } from "../actions"
import type { ContentRow } from "./content-list-client"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X, Clock, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function SortableRow({ item, index }: { item: ContentRow; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border bg-white px-2 py-2 transition-shadow",
        isDragging ? "border-zinc-900 shadow-lg relative z-10" : "border-zinc-200"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Dra for å endre rekkefølge"
        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 touch-none p-1 flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-5 text-center text-[11px] font-semibold text-zinc-400 flex-shrink-0 tabular-nums">{index + 1}</span>
      <span className="w-10 h-10 rounded-md overflow-hidden bg-zinc-100 flex-shrink-0 flex items-center justify-center">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-4 h-4 text-zinc-300" />
        )}
      </span>
      <span className="flex-1 min-w-0 text-sm font-medium text-zinc-900 truncate">{item.title || "Uten tittel"}</span>
      {item.durationSeconds ? (
        <span className="flex items-center gap-1 text-[11px] text-zinc-400 flex-shrink-0"><Clock className="w-3 h-3" />{item.durationSeconds}s</span>
      ) : null}
    </li>
  )
}

/**
 * Dra-og-slipp-dialog for å sette visningsrekkefølge på skjerm. Viser kun live
 * innhold (det som faktisk roterer). Rekkefølgen lagres som sort_order og styrer
 * rotasjonen i /widget/*. Erstatter ingen eksisterende funksjon — ren tilvekst.
 */
export function ReorderDialog({ items, onClose }: { items: ContentRow[]; onClose: () => void }) {
  const router = useRouter()
  const [ordered, setOrdered] = useState<ContentRow[]>(items)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setOrdered((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  async function save() {
    setSaving(true)
    const res = await reorderContent(ordered.map((o) => o.id))
    setSaving(false)
    if (res.ok) {
      toast.success("Rekkefølge lagret")
      router.refresh()
      onClose()
    } else {
      toast.error(res.error ?? "Kunne ikke lagre rekkefølge")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Rekkefølge på skjerm</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Dra for å bestemme rekkefølgen innholdet roterer i. Øverst vises først.</p>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1 rounded-lg text-zinc-400 hover:bg-zinc-100 flex-shrink-0" aria-label="Lukk">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {ordered.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-10">Ingen publisert innhold å sortere ennå.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ordered.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {ordered.map((item, i) => (
                    <SortableRow key={item.id} item={item} index={i} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100">
          <button onClick={onClose} className="text-sm font-medium text-zinc-600 px-3.5 py-2 rounded-lg hover:bg-zinc-100">Avbryt</button>
          <button
            onClick={save}
            disabled={saving || ordered.length === 0}
            className="text-sm font-semibold text-white px-3.5 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {saving ? "Lagrer…" : "Lagre rekkefølge"}
          </button>
        </div>
      </div>
    </div>
  )
}
