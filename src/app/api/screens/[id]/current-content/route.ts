// src/app/api/screens/[id]/current-content/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface Slide {
  id: string
  contentItemId: string
  moduleKey: string
  fields: Record<string, unknown>
  durationSeconds: number
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null
  const supabase = await createClient()

  const { data: screen } = await supabase
    .from("screens")
    .select("id, token, store_id, stores(chain_id)")
    .eq("id", id)
    .single()

  if (!screen) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: { user } } = await supabase.auth.getUser()
  const hasValidToken = token !== null && (screen as { token?: string | null }).token === token
  const hasAdminSession = !!user

  if (!hasValidToken && !hasAdminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Check if screen has a playlist
  const { data: screenPlaylists } = await supabase
    .from("screen_playlists")
    .select("playlist_id, priority")
    .eq("screen_id", id)
    .order("priority", { ascending: false })
    .limit(1)

  if (screenPlaylists && screenPlaylists.length > 0) {
    const playlistId = screenPlaylists[0].playlist_id
    const { data: items } = await supabase
      .from("playlist_items")
      .select(`
        id,
        position,
        duration_seconds,
        content_items(id, title, module_key, body, status)
      `)
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })

    const slides: Slide[] = []
    for (const item of items ?? []) {
      const ci = item.content_items as {
        id: string; title: string; module_key: string | null;
        body: { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null;
        status: string | null
      } | null
      if (!ci || ci.status !== "live") continue

      const placements = ci.body?.builder_v1?.placements ?? []
      if (placements.length > 0) {
        for (const p of placements) {
          slides.push({
            id: p.id,
            contentItemId: ci.id,
            moduleKey: p.moduleKey,
            fields: p.fields,
            durationSeconds: p.durationSeconds,
          })
        }
      } else if (ci.module_key) {
        slides.push({
          id: item.id,
          contentItemId: ci.id,
          moduleKey: ci.module_key,
          fields: (ci.body as Record<string, unknown>) ?? {},
          durationSeconds: item.duration_seconds,
        })
      }
    }
    return NextResponse.json({ slides })
  }

  // 2. Fallback: content_targets for this screen
  const storeId = (screen as { store_id: string | null }).store_id
  const chainId = (screen.stores as { chain_id: string } | null)?.chain_id ?? null

  const { data: targets } = await supabase
    .from("content_targets")
    .select(`
      content_item_id,
      target_all, chain_id, store_id,
      content_items!inner(id, title, module_key, body, status)
    `)
    .eq("content_items.status", "live")
    .order("content_item_id", { ascending: false })
    .limit(10)

  type Target = {
    content_item_id: string; target_all: boolean | null;
    chain_id: string | null; store_id: string | null;
    content_items: { id: string; title: string; module_key: string | null; body: Record<string, unknown> | null; status: string | null }
  }

  const matching = (targets as unknown as Target[] ?? []).filter(t =>
    t.target_all ||
    (t.store_id && t.store_id === storeId) ||
    (t.chain_id && t.chain_id === chainId)
  )

  const slides: Slide[] = []
  for (const t of matching) {
    const ci = t.content_items
    const placements = (ci.body as { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null)?.builder_v1?.placements ?? []
    if (placements.length > 0) {
      for (const p of placements) {
        slides.push({ id: p.id, contentItemId: ci.id, moduleKey: p.moduleKey, fields: p.fields, durationSeconds: p.durationSeconds })
      }
    } else if (ci.module_key) {
      slides.push({ id: ci.id, contentItemId: ci.id, moduleKey: ci.module_key, fields: ci.body ?? {}, durationSeconds: 15 })
    }
  }

  return NextResponse.json({ slides })
}
