import { requireRole } from "@/lib/admin/require-role"
import { createAdminClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { LoggClient, type LogRow } from "./logg-client"

/**
 * Audit-log viewer. Privileged roles only. The log table is service-role only
 * (RLS denies the user client), so we read it through the admin client AFTER
 * gating on role here.
 */

export const dynamic = "force-dynamic"

export default async function LoggPage() {
  await requireRole(["super_admin", "chain_manager"])
  const admin = createAdminClient()
  const { data } = await admin
    .from("audit_log")
    .select("id, created_at, user_email, action, entity_type, summary")
    .order("created_at", { ascending: false })
    .limit(400)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Logg" subtitle="Aktivitetslogg — innlogginger, endringer, publiseringer og slettinger" />
      <div className="flex-1 p-4 sm:p-6 max-w-4xl w-full">
        <LoggClient rows={(data ?? []) as LogRow[]} />
      </div>
    </div>
  )
}
