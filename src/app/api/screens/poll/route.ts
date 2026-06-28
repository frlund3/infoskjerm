import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ command: null })

  const supabase = await createClient()
  const { data: screen } = await supabase
    .from("screens")
    .select("id, pending_command")
    .eq("token", token)
    .single()

  if (!screen) return NextResponse.json({ command: null })

  const command = (screen as { pending_command?: string | null }).pending_command ?? null

  if (command) {
    await supabase
      .from("screens")
      .update({ pending_command: null, last_seen_at: new Date().toISOString() })
      .eq("id", screen.id)
  } else {
    await supabase
      .from("screens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", screen.id)
  }

  return NextResponse.json({ command })
}
