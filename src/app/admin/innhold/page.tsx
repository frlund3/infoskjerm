import { requireRole } from "@/lib/admin/require-role"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ContentListClient, type ContentRow } from "./_components/content-list-client"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function ContentListPage() {
  const { supabase } = await requireRole([...AUTHOR_ROLES])

  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, type, status, valid_from, valid_to, updated_at, content_targets(target_all, store_id, tag_id)")
    .order("updated_at", { ascending: false })

  const rows: ContentRow[] = (items ?? []).map((it) => {
    const targets = (it.content_targets ?? []) as { target_all: boolean | null; store_id: string | null; tag_id: string | null }[]
    let mode: ContentRow["target"]["mode"] = "none"
    let count = 0
    if (targets.some((t) => t.store_id)) { mode = "stores"; count = targets.filter((t) => t.store_id).length }
    else if (targets.some((t) => t.tag_id)) { mode = "tags"; count = targets.filter((t) => t.tag_id).length }
    else if (targets.some((t) => t.target_all)) { mode = "all" }
    return {
      id: it.id,
      title: it.title,
      type: it.type,
      status: it.status,
      validFrom: it.valid_from,
      validTo: it.valid_to,
      updatedAt: it.updated_at,
      target: { mode, count },
    }
  })

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold"
        subtitle="Nyheter, tilbud og kampanjer til skjermene"
        actions={
          <Link href="/admin/innhold/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus className="w-4 h-4" /> Nytt innhold
          </Link>
        }
      />
      <div className="flex-1 p-6 max-w-3xl">
        <ContentListClient items={rows} />
      </div>
    </div>
  )
}
