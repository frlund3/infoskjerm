import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { EmergencyPanel } from "./_components/emergency-panel"

export const dynamic = "force-dynamic"

export default async function EmergencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  if (role !== "super_admin" && role !== "chain_manager") redirect("/admin")

  // Fetch active priority items
  const { data: priorityItems } = await supabase
    .from("content_items")
    .select("id, title, type, status, created_at")
    .eq("is_priority", true)
    .order("created_at", { ascending: false })

  // Fetch live content items that can be activated as priority
  const { data: liveItems } = await supabase
    .from("content_items")
    .select("id, title, type, status, created_at")
    .eq("status", "live")
    .eq("is_priority", false)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nødkringkasting"
        subtitle="Aktiver prioritert innhold som vises på alle skjermer umiddelbart"
      />

      <div className="flex-1 p-6">
        <EmergencyPanel
          priorityItems={(priorityItems ?? []).map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            status: i.status,
            created_at: i.created_at,
          }))}
          liveItems={(liveItems ?? []).map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            status: i.status,
            created_at: i.created_at,
          }))}
        />
      </div>
    </div>
  )
}
