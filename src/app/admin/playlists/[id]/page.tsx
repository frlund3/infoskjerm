import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { notFound } from "next/navigation"
import { PlaylistDetailClient } from "./_components/playlist-detail-client"

export const dynamic = "force-dynamic"

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: playlist } = await supabase
    .from("playlists")
    .select(`
      id, name, tenant_id,
      playlist_items (
        id, position, duration_seconds,
        content_items ( id, title, type, status )
      )
    `)
    .eq("id", id)
    .single()

  if (!playlist) notFound()

  // Fetch available content to add (approved or live)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user!.id)
    .single()

  const { data: availableContent } = await supabase
    .from("content_items")
    .select("id, title, type, status")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .in("status", ["approved", "live", "draft"])
    .order("created_at", { ascending: false })
    .limit(100)

  type PlaylistItem = {
    id: string
    position: number | null
    duration_seconds: number | null
    content_items: { id: string; title: string; type: string; status: string | null } | null
  }

  const items = ((playlist.playlist_items as unknown as PlaylistItem[]) ?? [])
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={playlist.name}
        subtitle={`${items.length} elementer i spillelisten`}
        backHref="/admin/playlists"
      />
      <div className="flex-1 p-6">
        <PlaylistDetailClient
          playlistId={id}
          items={items}
          availableContent={availableContent ?? []}
        />
      </div>
    </div>
  )
}
