import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CloudSun, Plus, Pencil, Eye, Clock, Store } from "lucide-react"
import Link from "next/link"
import { ContentDeleteButton } from "../_components/content-delete-button"
import { ContentDuplicateButton } from "../_components/content-duplicate-button"

export const dynamic = "force-dynamic"

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const },
  draft: { label: "Utkast", variant: "secondary" as const },
  rejected: { label: "Avvist", variant: "destructive" as const },
}

export default async function WeatherPage() {
  const supabase = await createClient()
  const weatherItems = await getContentItems(supabase, "weather")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Vær"
        subtitle="Automatisk yr.no-data basert på butikkens koordinater"
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/builder" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Nytt vær-innhold
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <CloudSun className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Automatisk værhenting fra yr.no</p>
            <p className="text-xs text-blue-700 mt-0.5">Skjermene henter vær automatisk basert på GPS-koordinatene til hver butikk. Oppdateres hver 30. minutt. API-kobling aktiveres i neste fase.</p>
          </div>
        </div>

        {weatherItems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen vær-innhold er opprettet ennå.</p>
          </div>
        ) : (
          weatherItems.map((item) => {
            const statusKey = (item.status ?? "draft") as keyof typeof statusConfig
            const statusCfg = statusConfig[statusKey] ?? statusConfig.draft
            const author = ((item as unknown as Record<string, unknown>)['users!created_by'] as { full_name: string } | null)?.full_name ?? "Ukjent"
            const created = item.created_at
              ? new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : "—"

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <CloudSun className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Store className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs text-zinc-500">{author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs text-zinc-500">{created}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/preview/${item.id}`} target="_blank">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/admin/builder?id=${item.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <ContentDuplicateButton itemId={item.id} />
                      <ContentDeleteButton itemId={item.id} />
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
