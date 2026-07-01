import { requireRole } from "@/lib/admin/require-role"
import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { KundeklubbSettings } from "../../stores/_components/kundeklubb-settings"
import { MembersTable, type MemberRow } from "./members-table"

export const dynamic = "force-dynamic"

const MANAGER_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export default async function StoreKundeklubbPage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params
  const { userId, role, tenantId } = await requireRole([...MANAGER_ROLES])
  const admin = createAdminClient()

  const { data: s } = await admin
    .from("stores")
    .select("id, name, tenant_id, kundeklubb_enabled, kundeklubb_url, kundeklubb_headline, kundeklubb_subtext, kundeklubb_cta")
    .eq("id", store)
    .maybeSingle()
  if (!s || s.tenant_id !== tenantId) notFound()

  // Store-level scoping: area/store managers may only open a store assigned to
  // them in user_stores. Service-role bypasses RLS, so enforce it here — the
  // members list below is member PII (name/phone/email).
  const privileged = role === "super_admin" || role === "chain_manager"
  if (!privileged) {
    const { data: userStores } = await admin.from("user_stores").select("store_id").eq("user_id", userId)
    const accessible = new Set((userStores ?? []).map((r) => r.store_id).filter(Boolean) as string[])
    if (!accessible.has(store)) notFound()
  }

  const { data: members } = await admin
    .from("kundeklubb_members")
    .select("id, name, phone, email, created_at")
    .eq("store_id", store)
    .order("created_at", { ascending: false })

  const rows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.id, name: m.name, phone: m.phone, email: m.email, createdAt: m.created_at,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={s.name} subtitle="Kundeklubb-innstillinger og medlemmer" backHref="/admin/kundeklubb" />

      <div className="flex-1 grid grid-cols-1 gap-6 p-6 max-w-5xl lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <KundeklubbSettings
            storeId={s.id}
            initial={{
              enabled: s.kundeklubb_enabled,
              url: s.kundeklubb_url ?? "",
              headline: s.kundeklubb_headline ?? "",
              subtext: s.kundeklubb_subtext ?? "",
              cta: s.kundeklubb_cta ?? "",
            }}
          />
        </section>

        <section>
          <MembersTable rows={rows} storeName={s.name} />
        </section>
      </div>
    </div>
  )
}
