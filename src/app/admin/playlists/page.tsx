import { createClient } from "@/lib/supabase/server"
import { getPlaylistsWithItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Play, ListVideo } from "lucide-react"
import Link from "next/link"
import { PlaylistDeleteButton } from "./playlist-delete-button"
import { PlaylistFormDialog } from "./playlist-form-dialog"

export const dynamic = "force-dynamic"

interface PlaylistItem {
  id: string
  position: number | null
  duration_seconds: number | null
  content_items: { id: string; title: string; type: string } | null
}

export default async function PlaylistsPage() {
  const supabase = await createClient()
  const playlists = await getPlaylistsWithItems(supabase)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Spillelister"
        subtitle={`${playlists.length} spillelister`}
        actions={<PlaylistFormDialog />}
      />
      <div className="flex-1 p-6">
        {playlists.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen spillelister er opprettet ennå.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {playlists.map((pl) => {
              const items = (pl.playlist_items as unknown as PlaylistItem[]) ?? []
              const itemCount = items.length
              const totalSeconds = items.reduce((sum, i) => sum + (i.duration_seconds ?? 0), 0)
              const totalMin = Math.floor(totalSeconds / 60)
              const totalSec = totalSeconds % 60
              const durationLabel = totalSeconds > 0
                ? `${totalMin}m ${totalSec.toString().padStart(2, "0")}s`
                : "—"

              return (
                <Card key={pl.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                          <ListVideo className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">{pl.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{itemCount} elementer</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs text-zinc-400 mb-3">
                      <span className="flex items-center gap-1"><Play className="w-3 h-3" />{itemCount} elementer</span>
                      {totalSeconds > 0 && (
                        <span className="flex items-center gap-1">{durationLabel}</span>
                      )}
                    </div>

                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {items.slice(0, 5).map((item) => (
                          <span key={item.id} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                            {item.content_items?.title ?? "Ukjent"}
                          </span>
                        ))}
                        {items.length > 5 && (
                          <span className="text-[10px] bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full">
                            +{items.length - 5} til
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                      <Link href={`/admin/playlists/${pl.id}`} className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Rediger innhold
                      </Link>
                      <PlaylistDeleteButton playlistId={pl.id} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
