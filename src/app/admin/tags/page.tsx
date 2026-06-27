"use client"

import { useState } from "react"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tag, Plus, Pencil, Trash2 } from "lucide-react"

const defaultTags = [
  { id: "1", name: "SUNNMØRE", color: "#3b82f6", stores: ["EUROSPAR BLINDHEIM", "EUROSPAR HAREID", "EUROSPAR MOA", "SPAR ELLINGSØY", "JOKER GODØY"] },
  { id: "2", name: "NORDFJORD", color: "#8b5cf6", stores: ["SPAR RAUDEBERG", "SPAR HORNINDAL"] },
  { id: "3", name: "STORBY", color: "#f59e0b", stores: ["EUROSPAR MOA", "EUROSPAR ÅLESUND STORSENTER", "EUROSPAR LARSGÅRDEN", "EUROSPAR BLINDHEIM"] },
  { id: "4", name: "ØYBUTIKK", color: "#10b981", stores: ["JOKER GODØY", "SPAR ELLINGSØY", "SPAR LANGEVÅG"] },
  { id: "5", name: "PRISTEST", color: "#f43f5e", stores: [] },
  { id: "6", name: "ØRSTA-VOLDA", color: "#06b6d4", stores: ["EUROSPAR ØRSTA", "SPAR STRAUMANE", "SPAR FISKÅ"] },
]

export default function TagsPage() {
  const [tags, setTags] = useState(defaultTags)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Tags"
        subtitle="Grupper butikker for enkel publisering"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny tag
          </Button>
        }
      />

      <div className="flex-1 p-6">
        <div className="mb-4">
          <p className="text-sm text-zinc-500">
            Tags lar deg publisere innhold til grupper av butikker på tvers av kjeder — f.eks. alle butikker på Sunnmøre, eller alle storby-butikker.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: tag.color + "20" }}
                    >
                      <Tag className="w-5 h-5" style={{ color: tag.color }} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{tag.name}</p>
                      <p className="text-xs text-zinc-500">{tag.stores.length} butikker</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {tag.stores.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tag.stores.map((store) => (
                      <span
                        key={store}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: tag.color + "15", color: tag.color }}
                      >
                        {store}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">Ingen butikker lagt til ennå</p>
                )}

                <Button variant="outline" size="sm" className="w-full mt-4 text-xs">
                  Administrer butikker
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Add new tag card */}
          <Card className="border-dashed border-2 hover:border-zinc-300 transition-colors cursor-pointer">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-40 text-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Legg til tag</p>
              <p className="text-xs text-zinc-300 mt-1">F.eks. VESTLAND, KYST, KAMPANJE</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
