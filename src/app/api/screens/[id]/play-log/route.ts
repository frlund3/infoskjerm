import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screenId } = await params
    const body = await req.json() as {
      contentItemId?: string
      moduleKey?: string
      durationMs?: number
      slideIndex?: number
    }
    const { contentItemId, moduleKey, durationMs, slideIndex } = body

    if (!moduleKey) {
      return NextResponse.json({ ok: true }) // don't fail screens
    }

    const supabase = await createClient()

    const { data: screen } = await supabase
      .from("screens")
      .select("tenant_id")
      .eq("id", screenId)
      .single()

    if (!screen) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await supabase.from("play_log").insert({
      tenant_id: screen.tenant_id,
      screen_id: screenId,
      content_item_id: contentItemId ?? null,
      module_key: moduleKey,
      duration_ms: durationMs ?? null,
      slide_index: slideIndex ?? null,
    })

    if (error) {
      console.error("play_log insert error:", error.message)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // always return 200 to not disrupt screens
  }
}
