import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Eye, Image as ImageIcon, GripVertical } from "lucide-react"
import Link from "next/link"
import { ContentDeleteButton } from "../_components/content-delete-button"
import { ContentDuplicateButton } from "../_components/content-duplicate-button"

export const dynamic = "force-dynamic"

const statusColors = {
  approved: "bg-emerald-50 text-emerald-700",
  pending_approval: "bg-amber-50 text-amber-700",
  draft: "bg-zinc-100 text-zinc-500",
  rejected: "bg-red-50 text-red-700",
}

const statusLabels = {
  approved: "Publisert",
  pending_approval: "Venter godkjenning",
  draft: "Utkast",
  rejected: "Avvist",
}

export default async function SlidesPage() {
  const supabase = await createClient()
  const slides = await getContentItems(supabase, "slide")

  const activeCount = slides.filter((s) => s.status === "approved").length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Slides"
        subtitle={`${activeCount} publiserte slides`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/builder" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Ny slide
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-3">
        {slides.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen slides er opprettet ennå.</p>
          </div>
        ) : (
          slides.map((slide) => {
            const statusKey = (slide.status ?? "draft") as keyof typeof statusColors
            const colorClass = statusColors[statusKey] ?? statusColors.draft
            const label = statusLabels[statusKey] ?? statusLabels.draft

            return (
              <Card key={slide.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <button className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </button>

                    <div className="w-20 h-14 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-200">
                      <ImageIcon className="w-6 h-6 text-zinc-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm">{slide.title}</p>
                    </div>

                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
                      {label}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/preview/${slide.id}`} target="_blank">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/admin/builder?id=${slide.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <ContentDuplicateButton itemId={slide.id} />
                      <ContentDeleteButton itemId={slide.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
