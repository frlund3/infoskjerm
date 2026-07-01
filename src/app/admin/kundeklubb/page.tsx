import { requireRole } from "@/lib/admin/require-role"
import { createAdminClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Users, QrCode, ChevronRight } from "lucide-react"

export const dynamic = "force-dynamic"

const MANAGER_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

interface ChainRow { name: string }

export default async function KundeklubbOverviewPage() {
  const { tenantId } = await requireRole([...MANAGER_ROLES])
  const admin = createAdminClient()

  const { data: stores } = await admin
    .from("stores")
    .select("id, name, city, kundeklubb_enabled, kundeklubb_headline, chains(name)")
    .eq("tenant_id", tenantId)
    .order("name")

  const ids = (stores ?? []).map((s) => s.id)
  const members = new Map<string, number>()
  if (ids.length > 0) {
    const { data: rows } = await admin.from("kundeklubb_members").select("store_id").in("store_id", ids)
    for (const r of rows ?? []) if (r.store_id) members.set(r.store_id, (members.get(r.store_id) ?? 0) + 1)
  }
  const totalMembers = Array.from(members.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Kundeklubb" subtitle="QR-påmelding til kundeklubben — tekst, status og medlemmer per butikk" />

      <div className="flex-1 p-6 max-w-5xl space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><Users className="h-3.5 w-3.5" /> Medlemmer totalt</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{totalMembers}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><QrCode className="h-3.5 w-3.5" /> Aktive butikker</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{(stores ?? []).filter((s) => s.kundeklubb_enabled).length}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {(stores ?? []).map((s) => {
            const chain = s.chains as unknown as ChainRow | null
            const count = members.get(s.id) ?? 0
            return (
              <Link key={s.id} href={`/admin/kundeklubb/${s.id}`}
                className="flex items-center gap-4 border-b border-zinc-50 px-4 py-3.5 last:border-0 hover:bg-zinc-50/60">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.kundeklubb_enabled ? "bg-emerald-500" : "bg-zinc-300"}`} title={s.kundeklubb_enabled ? "På" : "Av"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{s.name}</p>
                  <p className="truncate text-xs text-zinc-400">{[chain?.name, s.city].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <Users className="h-3.5 w-3.5" /> {count}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-300" />
              </Link>
            )
          })}
          {(stores ?? []).length === 0 && (
            <div className="px-4 py-12 text-center">
              <Users className="mx-auto mb-2 h-9 w-9 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">Ingen butikker ennå</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
