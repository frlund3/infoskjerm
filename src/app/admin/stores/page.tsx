import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Mail, Building2, ExternalLink, Filter } from "lucide-react"
import Link from "next/link"

const chains = [
  {
    name: "EUROSPAR",
    color: "#E30613",
    textColor: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-100",
    stores: [
      { name: "EUROSPAR BLINDHEIM", company: "BLINDHEIM MAT AS", org: "982121612", gln: "7080000884582", email: "eurospar.blindheim@spar.no", city: "Ålesund", screens: 1, online: 1 },
      { name: "EUROSPAR HAREID", company: "SPAR-KJØP AS", org: "937471297", gln: "7080000025220", email: "eurospar.hareid@spar.no", city: "Hareid", screens: 1, online: 1 },
      { name: "EUROSPAR LARSGÅRDEN", company: "LARSGÅRDEN MAT AS", org: "928182894", gln: "7080004256750", email: "eurospar.larsgarden@spar.no", city: "Ålesund", screens: 1, online: 1 },
      { name: "EUROSPAR MOA", company: "MOA MAT AS", org: "995711907", gln: "7080003431554", email: "eurospar.moa@spar.no", city: "Ålesund", screens: 1, online: 1 },
      { name: "EUROSPAR ÅLESUND STORSENTER", company: "GRIMMERMAT AS", org: "979983557", gln: "7080000620753", email: "spar.alesund-storsenter@spar.no", city: "Ålesund", screens: 1, online: 1 },
      { name: "EUROSPAR ØRSTA", company: "FJORDTORGET MAT AS", org: "888031502", gln: "7080001090708", email: "eurospar.orsta@spar.no", city: "Ørsta", screens: 1, online: 1 },
    ],
  },
  {
    name: "JOKER",
    color: "#F7A600",
    textColor: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
    stores: [
      { name: "JOKER GODØY", company: "MIDTBØ HANDEL AS", org: "989111787", gln: "7080001100599", email: "joker.god@joker.no", city: "Giske", screens: 1, online: 1 },
      { name: "JOKER ÅHEIM", company: "OSNES MAT AS", org: "951969540", gln: "7080001460440", email: "joker.aheim@joker.no", city: "Sande", screens: 1, online: 1 },
    ],
  },
  {
    name: "SPAR",
    color: "#007B40",
    textColor: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    stores: [
      { name: "SPAR ELLINGSØY", company: "ELLINGSØY LAVPRIS AS", org: "846008152", gln: "7080000396399", email: "spar.ellingsoy@spar.no", city: "Ålesund", screens: 1, online: 1 },
      { name: "SPAR HORNINDAL", company: "HORNINDAL MAT AS", org: "998993636", gln: "7080001285746", email: "spar.hornindal@spar.no", city: "Hornindal", screens: 1, online: 0 },
      { name: "SPAR LANGEVÅG", company: "SULA MAT AS", org: "932302667", gln: "7080004404472", email: "spar.langevag@spar.no", city: "Sula", screens: 1, online: 1 },
      { name: "SPAR RAUDEBERG", company: "RAUDEBERG MAT AS", org: "815078632", gln: "7080001363093", email: "spar.raudeberg@spar.no", city: "Vågsøy", screens: 1, online: 1 },
      { name: "SPAR STRAUMANE", company: "STRAUMANE MAT AS", org: "991255095", gln: "7080001137793", email: "spar.straumane@spar.no", city: "Ørsta", screens: 1, online: 1 },
      { name: "SPAR TRESFJORD", company: "TRESFJORDMAT AS", org: "980021335", gln: "7080000602322", email: "spar.tresfjord@spar.no", city: "Vestnes", screens: 1, online: 1 },
      { name: "SPAR ULSTEINVIK", company: "ULSTEIN MAT AS", org: "927794373", gln: "7080004241213", email: "spar.ulsteinvik@spar.no", city: "Ulstein", screens: 1, online: 1 },
      { name: "SPAR FISKÅ", company: "FISKÅ MAT AS", org: "—", gln: "—", email: "spar.fiskaa@spar.no", city: "Ørsta", screens: 0, online: 0 },
    ],
  },
]

export default function StoresPage() {
  const totalStores = chains.reduce((s, c) => s + c.stores.length, 0)
  const totalOnline = chains.reduce((s, c) => s + c.stores.reduce((a, b) => a + b.online, 0), 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Butikker"
        subtitle={`${totalStores} butikker — ${totalOnline} skjermer online`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button size="sm">Legg til butikk</Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {chains.map((chain) => (
          <div key={chain.name}>
            {/* Chain header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: chain.color }} />
              <h2 className="font-bold text-zinc-900">{chain.name}</h2>
              <span className="text-sm text-zinc-400">{chain.stores.length} butikker</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {chain.stores.map((store) => (
                <Card key={store.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status dot */}
                      <div className="flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${store.online > 0 ? "bg-emerald-500" : store.screens === 0 ? "bg-zinc-300" : "bg-red-500"}`} />
                      </div>

                      {/* Store name + company */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-900 text-sm">{store.name}</p>
                          <Badge
                            className="text-[10px] px-2 py-0"
                            style={{ backgroundColor: chain.color + "20", color: chain.color, border: `1px solid ${chain.color}40` }}
                          >
                            {chain.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-400" />
                          <p className="text-xs text-zinc-500">{store.company}</p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="hidden lg:flex items-center gap-6">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Org.nr</p>
                          <p className="text-xs font-mono text-zinc-600">{store.org}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">GLN</p>
                          <p className="text-xs font-mono text-zinc-600">{store.gln}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">By</p>
                          <p className="text-xs text-zinc-600">{store.city}</p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="hidden xl:flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <p className="text-xs text-zinc-500">{store.email}</p>
                      </div>

                      {/* Screens */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs text-zinc-600">{store.screens} skjerm{store.screens !== 1 ? "er" : ""}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/stores/${store.name.toLowerCase().replace(/\s+/g, "-")}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
