"use client"

import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, Clock, Store, Globe } from "lucide-react"

const news = [
  { id: "1", title: "Sommerferieåpningstider 2025", body: "Vi minner om at alle butikker har endrede åpningstider i juli...", status: "approved", target: "Alle butikker", author: "Frank Lunde", created: "25. jun 2025", validTo: "31. jul 2025" },
  { id: "2", title: "Ny ansatt på MOA — velkommen Kari!", body: "Vi ønsker Kari Nordmann hjertelig velkommen som ny kassemedarbeider på EUROSPAR MOA...", status: "approved", target: "EUROSPAR MOA", author: "Butikksjef MOA", created: "24. jun 2025", validTo: null },
  { id: "3", title: "Viktig info om varelevering denne uken", body: "Grunnet veiarbeid på E39 vil vareleveringen...", status: "pending_approval", target: "SPAR HORNINDAL", author: "Butikksjef Hornindal", created: "26. jun 2025", validTo: "28. jun 2025" },
  { id: "4", title: "JOKER-kampanje: 3 for 2 på brus", body: "Denne uken har vi 3 for 2 på alle brusvarianter...", status: "approved", target: "Kjede: JOKER", author: "Frank Lunde", created: "23. jun 2025", validTo: "29. jun 2025" },
  { id: "5", title: "Personalmøte torsdag", body: "Det er personalmøte for alle ansatte torsdag kl. 08:00...", status: "draft", target: "EUROSPAR ØRSTA", author: "Butikksjef Ørsta", created: "26. jun 2025", validTo: null },
]

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const },
  draft: { label: "Utkast", variant: "secondary" as const },
  rejected: { label: "Avvist", variant: "destructive" as const },
}

export default function NewsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nyheter"
        subtitle={`${news.length} nyheter — ${news.filter(n => n.status === "pending_approval").length} venter godkjenning`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny nyhet
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-3">
        {/* Pending approval banner */}
        {news.some(n => n.status === "pending_approval") && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {news.filter(n => n.status === "pending_approval").length} nyhet(er) venter godkjenning
                </p>
                <p className="text-xs text-amber-700">Ansatte har sendt inn innhold som trenger din godkjenning</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
              Godkjenn nå
            </Button>
          </div>
        )}

        {news.map((item) => {
          const statusCfg = statusConfig[item.status as keyof typeof statusConfig]
          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-1">{item.body}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500">{item.target}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500">{item.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500">{item.created}</span>
                      </div>
                      {item.validTo && (
                        <span className="text-xs text-zinc-400">Utløper {item.validTo}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === "pending_approval" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Godkjenn</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Avvis</Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
