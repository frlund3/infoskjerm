import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ContentListClient } from "../innhold/_components/content-list-client"
import { loadContentForAudience } from "../innhold/content-data"

export const dynamic = "force-dynamic"

export default async function CustomerContentListPage() {
  const { rows, stores, tags } = await loadContentForAudience("kunde")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold kundeskjerm"
        subtitle="Tilbud, annonser og plakater til kundene i butikken"
        actions={
          <Link href="/admin/kundeinnhold/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus className="w-4 h-4" /> Nytt kundeinnhold
          </Link>
        }
      />
      <div className="flex-1 p-6 max-w-6xl">
        <ContentListClient items={rows} stores={stores} tags={tags} newHref="/admin/kundeinnhold/ny" />
      </div>
    </div>
  )
}
