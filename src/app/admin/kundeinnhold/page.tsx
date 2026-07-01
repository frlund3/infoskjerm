import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus, Layers } from "lucide-react"
import { ContentListClient } from "../innhold/_components/content-list-client"
import { loadContentForAudience } from "../innhold/content-data"
import { requireRole } from "@/lib/admin/require-role"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function CustomerContentListPage() {
  const { supabase, tenantId } = await requireRole([...AUTHOR_ROLES])
  const [{ rows, stores, tags }, config] = await Promise.all([
    loadContentForAudience("kunde"),
    getTenantConfig(supabase, tenantId),
  ])
  // Masseimport av tilbud (varekort) er dagligvare-spesifikt.
  const showBulkImport = hasFeature(config.features, "offerCards")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold kundeskjerm"
        subtitle={`Tilbud, annonser og plakater til kundene i ${config.unitLabel.toLowerCase()}en`}
        actions={
          <div className="flex items-center gap-2">
            {showBulkImport && (
              <Link href="/admin/kundeinnhold/bulk" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 border border-zinc-200 hover:border-zinc-300 px-3.5 py-2 rounded-lg">
                <Layers className="w-4 h-4" /> Masseimport
              </Link>
            )}
            <Link href="/admin/kundeinnhold/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
              <Plus className="w-4 h-4" /> Nytt kundeinnhold
            </Link>
          </div>
        }
      />
      <div className="flex-1 p-4 sm:p-6 max-w-6xl">
        <ContentListClient items={rows} stores={stores} tags={tags} newHref="/admin/kundeinnhold/ny" editBase="/admin/kundeinnhold" audience="kunde" />
      </div>
    </div>
  )
}
