import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { CalendarClient } from "./_components/calendar-client"

export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, type, status, scheduled_at, published_at, created_at")
    .in("status", ["draft", "pending_approval", "approved", "live", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Publiseringskalender"
        subtitle="Oversikt over planlagte og publiserte innhold"
      />
      <div className="flex-1 p-6">
        <CalendarClient items={items ?? []} />
      </div>
    </div>
  )
}
