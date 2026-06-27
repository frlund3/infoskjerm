import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Monitor, Store, Newspaper, Trophy,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  ArrowRight, Eye
} from "lucide-react"
import Link from "next/link"

const stats = [
  {
    label: "Aktive skjermer",
    value: "17",
    sub: "av 17 totalt",
    icon: Monitor,
    trend: "+2 denne uken",
    up: true,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Butikker",
    value: "17",
    sub: "3 kjeder",
    icon: Store,
    trend: "Alle aktive",
    up: true,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Aktive nyheter",
    value: "8",
    sub: "2 venter godkjenning",
    icon: Newspaper,
    trend: "+3 siden i går",
    up: true,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Aktive konkurranser",
    value: "2",
    sub: "1 utløper snart",
    icon: Trophy,
    trend: "Avsluttes fredag",
    up: false,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
]

const recentActivity = [
  { type: "news", text: "Ny nyhet publisert: Sommeråpningstider", store: "EUROSPAR MOA", time: "5 min siden", status: "published" },
  { type: "approval", text: "Venter godkjenning: Ukens tilbud", store: "SPAR ULSTEINVIK", time: "23 min siden", status: "pending" },
  { type: "screen", text: "Skjerm koblet til: Personalrom", store: "JOKER GODØY", time: "1 time siden", status: "online" },
  { type: "competition", text: "Konkurranse oppdatert: Sommerquiz", store: "Alle butikker", time: "2 timer siden", status: "published" },
  { type: "screen", text: "Skjerm offline", store: "SPAR HORNINDAL", time: "3 timer siden", status: "offline" },
]

const chainOverview = [
  { name: "EUROSPAR", stores: 6, screens: 6, color: "#E30613", online: 6 },
  { name: "JOKER", stores: 2, screens: 2, color: "#F7A600", online: 2 },
  { name: "SPAR", stores: 9, screens: 9, color: "#007B40", online: 8 },
]

export default function AdminDashboard() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Dashboard"
        subtitle="Gange-Rolv Infoskjerm — oversikt"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/publish">
              <Eye className="w-4 h-4" />
              Publiser innhold
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-zinc-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{stat.sub}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3">
                    {stat.up
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : <TrendingDown className="w-3 h-3 text-amber-500" />
                    }
                    <span className={`text-xs ${stat.up ? "text-emerald-600" : "text-amber-600"}`}>
                      {stat.trend}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Kjede-oversikt */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kjeder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chainOverview.map((chain) => (
                <div key={chain.name} className="flex items-center gap-3">
                  <div
                    className="w-2 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: chain.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900">{chain.name}</p>
                      <span className="text-xs text-zinc-400">{chain.stores} butikker</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(chain.online / chain.screens) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{chain.online}/{chain.screens} online</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link href="/admin/stores">
                  Se alle butikker <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Aktivitet */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Siste aktivitet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-zinc-50 last:border-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {item.status === "pending" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                    {item.status === "published" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {item.status === "online" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    {item.status === "offline" && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800">{item.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">{item.store}</span>
                      <span className="text-zinc-200">·</span>
                      <span className="text-xs text-zinc-400">{item.time}</span>
                    </div>
                  </div>
                  {item.status === "pending" && (
                    <Badge variant="warning" className="flex-shrink-0">Godkjenn</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Skjermstatus grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Skjermstatus — alle butikker</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/screens">Se alle <ArrowRight className="w-3 h-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {[
                { name: "EUROSPAR BLINDHEIM", online: true },
                { name: "EUROSPAR HAREID", online: true },
                { name: "EUROSPAR LARSGÅRDEN", online: true },
                { name: "EUROSPAR MOA", online: true },
                { name: "EUROSPAR ÅLESUND", online: true },
                { name: "EUROSPAR ØRSTA", online: true },
                { name: "JOKER GODØY", online: true },
                { name: "JOKER ÅHEIM", online: true },
                { name: "SPAR ELLINGSØY", online: true },
                { name: "SPAR HORNINDAL", online: false },
                { name: "SPAR LANGEVÅG", online: true },
                { name: "SPAR RAUDEBERG", online: true },
                { name: "SPAR STRAUMANE", online: true },
                { name: "SPAR TRESFJORD", online: true },
                { name: "SPAR ULSTEINVIK", online: true },
                { name: "SPAR FISKÅ", online: true },
              ].map((screen) => (
                <div
                  key={screen.name}
                  className={`rounded-lg p-2.5 border text-center ${
                    screen.online
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${screen.online ? "bg-emerald-500" : "bg-red-500"}`} />
                  <p className="text-[10px] font-medium text-zinc-700 leading-tight">{screen.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
