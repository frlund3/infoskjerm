import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // Find all scheduled content items where scheduled_at has passed
  const { data: items, error } = await supabase
    .from("content_items")
    .select("id, title, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ promoted: 0 })
  }

  const ids = items.map((i) => i.id)

  const { error: updateError } = await supabase
    .from("content_items")
    .update({ status: "live", published_at: now })
    .in("id", ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log each promotion
  await Promise.all(
    items.map((item) =>
      supabase.from("publish_log").insert({
        content_item_id: item.id,
        action: "auto_published",
        performed_by: null,
        snapshot: { title: item.title, scheduled_at: item.scheduled_at },
      })
    )
  )

  console.log(`[cron] Promoted ${ids.length} scheduled items to live`)
  return NextResponse.json({ promoted: ids.length, ids })
}
