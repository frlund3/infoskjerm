import { requireRole } from "@/lib/admin/require-role"
import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Pencil, Users, UserPlus, CalendarDays, MapPin } from "lucide-react"
import { SignupsTable, type SignupRow } from "./signups-table"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

interface InvBody {
  invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null }
}

function fmtEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(iso)
  const date = d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })
  const cap = date.charAt(0).toUpperCase() + date.slice(1)
  return hasTime ? `${cap} kl. ${d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}` : cap
}

export default async function InvitationSignupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { tenantId } = await requireRole([...AUTHOR_ROLES])
  const admin = createAdminClient()

  const { data: inv } = await admin
    .from("content_items")
    .select("id, title, type, body, tenant_id")
    .eq("id", id)
    .maybeSingle()
  if (!inv || inv.type !== "invitation" || inv.tenant_id !== tenantId) notFound()

  const { data: signups } = await admin
    .from("event_signups")
    .select("id, name, department, guests, dietary, comment, email, phone, store_id, created_at")
    .eq("content_item_id", id)
    .order("created_at", { ascending: true })

  // Resolve store names for signups that captured which screen they scanned.
  const storeIds = Array.from(new Set((signups ?? []).map((s) => s.store_id).filter(Boolean))) as string[]
  const storeName = new Map<string, string>()
  if (storeIds.length > 0) {
    const { data: stores } = await admin.from("stores").select("id, name").in("id", storeIds)
    for (const s of stores ?? []) storeName.set(s.id, s.name)
  }

  const rows: SignupRow[] = (signups ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    department: s.department,
    guests: s.guests,
    dietary: s.dietary,
    comment: s.comment,
    email: s.email,
    phone: s.phone,
    store: s.store_id ? storeName.get(s.store_id) ?? null : null,
    createdAt: s.created_at,
  }))

  const meta = (inv.body ?? {}) as InvBody
  const when = fmtEventDate(meta.invitation?.eventDate)
  const totalPeople = rows.reduce((n, r) => n + 1 + (r.guests ?? 0), 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={inv.title}
        subtitle="Påmeldinger til arrangementet"
        backHref="/admin/invitasjoner"
        actions={
          <Link href={`/admin/invitasjoner/${id}/rediger`} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900">
            <Pencil className="h-3.5 w-3.5" /> Rediger invitasjon
          </Link>
        }
      />

      <div className="flex-1 p-6 max-w-5xl space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><Users className="h-3.5 w-3.5" /> Påmeldte</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><UserPlus className="h-3.5 w-3.5" /> Inkl. følge</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{totalPeople}</p>
          </div>
          {when && (
            <div className="col-span-2 rounded-xl border border-zinc-200 bg-white p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><CalendarDays className="h-3.5 w-3.5" /> Når</p>
              <p className="mt-1 text-sm font-bold text-zinc-900">{when}</p>
              {meta.invitation?.eventPlace && <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="h-3 w-3" /> {meta.invitation.eventPlace}</p>}
            </div>
          )}
        </div>

        <SignupsTable rows={rows} eventTitle={inv.title} />
      </div>
    </div>
  )
}
