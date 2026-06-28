"use client"

import { useState } from "react"
import { Trash2, Plus, GripVertical, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addToPlaylist, removeFromPlaylist, updateItemDuration } from "../../actions"
import { toast } from "sonner"

interface ContentItem {
  id: string
  title: string
  type: string
  status: string | null
}

interface PlaylistItem {
  id: string
  position: number | null
  duration_seconds: number | null
  content_items: ContentItem | null
}

interface Props {
  playlistId: string
  items: PlaylistItem[]
  availableContent: ContentItem[]
}

const typeLabels: Record<string, string> = {
  news: "Nyhet", competition: "Konkurranse", stats: "Salgstall",
  weather: "Vær", slide: "Slide",
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500",
  approved: "bg-blue-100 text-blue-700",
  live: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  pending_approval: "bg-amber-100 text-amber-700",
}

export function PlaylistDetailClient({ playlistId, items, availableContent }: Props) {
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const addedContentIds = new Set(items.map(i => i.content_items?.id).filter(Boolean))
  const notAdded = availableContent.filter(c => !addedContentIds.has(c.id))

  async function handleAdd(contentItemId: string) {
    setAddingId(contentItemId)
    const result = await addToPlaylist(playlistId, contentItemId)
    setAddingId(null)
    if (result.ok) toast.success("Lagt til i spilleliste")
    else toast.error(result.error ?? "Feil")
  }

  async function handleRemove(playlistItemId: string) {
    setRemovingId(playlistItemId)
    const result = await removeFromPlaylist(playlistItemId, playlistId)
    setRemovingId(null)
    if (result.ok) toast.success("Fjernet fra spilleliste")
    else toast.error(result.error ?? "Feil")
  }

  async function handleDurationChange(playlistItemId: string, seconds: number) {
    await updateItemDuration(playlistItemId, seconds, playlistId)
    toast.success("Varighet oppdatert")
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Current items */}
      <div className="bg-white rounded-xl border border-zinc-100">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Innhold i spillelisten</h2>
          <Button size="sm" onClick={() => setShowAddPanel(!showAddPanel)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Legg til innhold
            <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showAddPanel ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">
            Ingen elementer ennå. Legg til innhold ovenfor.
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-zinc-300 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </span>
                <span className="text-xs text-zinc-400 w-5 tabular-nums">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {item.content_items?.title ?? "Ukjent"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">{typeLabels[item.content_items?.type ?? ""] ?? item.content_items?.type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[item.content_items?.status ?? "draft"] ?? statusColors.draft}`}>
                      {item.content_items?.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-300" />
                  <select
                    defaultValue={item.duration_seconds ?? 15}
                    onChange={(e) => handleDurationChange(item.id, Number(e.target.value))}
                    className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map(s => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add content panel */}
      {showAddPanel && (
        <div className="bg-white rounded-xl border border-zinc-100">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Velg innhold å legge til</h2>
          </div>
          {notAdded.length === 0 ? (
            <div className="px-5 py-8 text-center text-zinc-400 text-sm">
              Alt tilgjengelig innhold er allerede i spillelisten.
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {notAdded.map((content) => (
                <div key={content.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{content.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{typeLabels[content.type] ?? content.type}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[content.status ?? "draft"] ?? statusColors.draft}`}>
                    {content.status}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdd(content.id)}
                    disabled={addingId === content.id}
                  >
                    {addingId === content.id ? "Legger til..." : "Legg til"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
