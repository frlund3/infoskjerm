"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function createPlaylist(name: string) {
  const { supabase, userId } = await requireUser()

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { error } = await supabase.from("playlists").insert({
    name: name.trim(),
    tenant_id: profile.tenant_id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/playlists")
  return { ok: true }
}

export async function deletePlaylist(playlistId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("playlists").delete().eq("id", playlistId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/playlists")
  return { ok: true }
}

export async function addToPlaylist(playlistId: string, contentItemId: string, durationSeconds: number = 15) {
  const { supabase } = await requireUser()

  // Get max position
  const { data: existing } = await supabase
    .from("playlist_items")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? (existing[0].position ?? 0) + 1 : 0

  const { error } = await supabase.from("playlist_items").insert({
    playlist_id: playlistId,
    content_item_id: contentItemId,
    position: nextPosition,
    duration_seconds: durationSeconds,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/playlists/${playlistId}`)
  return { ok: true }
}

export async function removeFromPlaylist(playlistItemId: string, playlistId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("playlist_items").delete().eq("id", playlistItemId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/playlists/${playlistId}`)
  return { ok: true }
}

export async function updateItemDuration(playlistItemId: string, durationSeconds: number, playlistId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("playlist_items")
    .update({ duration_seconds: durationSeconds })
    .eq("id", playlistItemId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/admin/playlists/${playlistId}`)
  return { ok: true }
}

export async function reorderPlaylistItems(playlistId: string, orderedIds: string[]) {
  const { supabase } = await requireUser()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("playlist_items").update({ position: index }).eq("id", id)
    )
  )
  revalidatePath(`/admin/playlists/${playlistId}`)
  return { ok: true }
}
