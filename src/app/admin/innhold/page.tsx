import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ContentListClient } from "./_components/content-list-client"
import { loadContentForAudience } from "./content-data"

export const dynamic = "force-dynamic"

export default async function ContentListPage() {
  const { rows, stores, tags } = await loadContentForAudience("intern")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold"
        subtitle="Internt: nyheter, stilling, gratulerer og ticker (bakrom/ansatte)"
        actions={
          <Link href="/admin/innhold/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus className="w-4 h-4" /> Nytt innhold
          </Link>
        }
      />
      <div className="flex-1 p-4 sm:p-6 max-w-6xl">
        <ContentListClient items={rows} stores={stores} tags={tags} newHref="/admin/innhold/ny" />
      </div>
    </div>
  )
}
