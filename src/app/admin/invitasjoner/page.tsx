import { requireRole } from "@/lib/admin/require-role"
import { createAdminClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus, Ticket, Users, CalendarDays, MapPin, Pencil } from "lucide-react"
import { scopeInvitations } from "./access"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

interface InvBody {
  invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null }
  imageUrl?: string | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  live: { label: "Publisert", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft: { label: "Utkast", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
}

function fmtEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(iso)
  const date = d.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" })
  return hasTime ? `${date} kl. ${d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}` : date
}

export default async function InvitasjonerPage() {
  const { userId, role, tenantId } = await requireRole([...AUTHOR_ROLES])
  const admin = createAdminClient()

  const { data: allInvitations } = await admin
    .from("content_items")
    .select("id, title, status, body, created_at, created_by, content_targets(target_all, store_id, tag_id)")
    .eq("tenant_id", tenantId)
    .eq("type", "invitation")
    .order("created_at", { ascending: false })

  // Store-level scoping (mirrors src/app/admin/innhold/content-data.ts canSee):
  // chain-wide roles see every invitation in the tenant; area/store managers
  // only see invitations they created OR that reach one of their assigned
  // stores. Service-role bypasses RLS, so this MUST be enforced here — the
  // detail page exposes signup PII (name/email/phone/dietary).
  const invitations = await scopeInvitations(admin, allInvitations ?? [], userId, role)

  const ids = (invitations ?? []).map((i) => i.id)
  const counts = new Map<string, { people: number; total: number }>()
  if (ids.length > 0) {
    const { data: signups } = await admin.from("event_signups").select("content_item_id, guests").in("content_item_id", ids)
    for (const s of signups ?? []) {
      const c = counts.get(s.content_item_id) ?? { people: 0, total: 0 }
      c.people += 1
      c.total += 1 + (s.guests ?? 0)
      counts.set(s.content_item_id, c)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Invitasjoner"
        subtitle="Arrangement med påmelding — vises internt med QR-kode på skjermene"
        actions={
          <Link href="/admin/invitasjoner/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus className="w-4 h-4" /> Ny invitasjon
          </Link>
        }
      />

      <div className="flex-1 p-6 max-w-5xl">
        {(invitations ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b1d63] to-[#7a2e62] text-white">
              <Ticket className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">Ingen invitasjoner ennå</h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">Lag en råflott invitasjon til julebord, sommerfest eller kurs — med bilde, tekst og QR-kode for påmelding rett på skjermen.</p>
            <Link href="/admin/invitasjoner/ny" className="mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
              <Plus className="h-4 w-4" /> Ny invitasjon
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(invitations ?? []).map((inv) => {
              const body = (inv.body ?? {}) as InvBody
              const meta = body.invitation ?? {}
              const status = STATUS_LABEL[inv.status ?? "draft"] ?? STATUS_LABEL.draft
              const when = fmtEventDate(meta.eventDate)
              const c = counts.get(inv.id) ?? { people: 0, total: 0 }
              const image = body.imageUrl ?? null

              return (
                <div key={inv.id} className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative h-24" style={{ background: "linear-gradient(135deg,#1a1333,#3b1d63 55%,#7a2e62)" }}>
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#f5c451] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1a1333]">🎉 Invitasjon</span>
                    <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
                  </div>

                  <div className="p-4">
                    <h3 className="truncate text-base font-bold text-zinc-900">{inv.title}</h3>
                    <div className="mt-2 space-y-1 text-xs text-zinc-500">
                      {when && <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {when}</p>}
                      {meta.eventPlace && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {meta.eventPlace}</p>}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Link href={`/admin/invitasjoner/${inv.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800">
                        <Users className="h-3.5 w-3.5" /> {c.people} påmeldt{c.total !== c.people ? ` · ${c.total} m/følge` : ""}
                      </Link>
                      <Link href={`/admin/invitasjoner/${inv.id}/rediger`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900">
                        <Pencil className="h-3.5 w-3.5" /> Rediger
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
