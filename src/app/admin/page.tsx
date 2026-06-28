import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScreenStatusDot } from "@/components/admin/screen-status-dot"
import { Monitor, Store, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getAdminStats, getChainOverview, formatLastSeen, getScreenStatusColor } from "@/lib/admin/queries"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [stats, chains, activityResult] = await Promise.all([
    getAdminStats(supabase),
    getChainOverview(supabase),
    supabase
      .from("publish_log")
      .select("id, action, created_at, content_item_id, content_items(title), users(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const activityLog = activityResult.data ?? []

  const { data: recentScreens } = await supabase
    .from("screens")
    .select("id, name, status, last_heartbeat, stores(name)")
    .order("last_heartbeat", { ascending: false, nullsFirst: false })
    .limit(16)

  const screens = recentScreens ?? []

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Dashboard"
        subtitle="Gange-Rolv Infoskjerm — oversikt"
        actions={
          <Button asChild size="sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}>
            <Link href="/admin/publish">
              Publiser innhold
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Skjermer online</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.onlineScreens}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">av {stats.totalScreens} totalt</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Butikker</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.totalStores}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{chains.length} kjeder</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Til godkjenning</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.pendingApproval}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">venter på deg</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Innhold live</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.liveContent}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">aktive elementer</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kjeder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chains.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Ingen kjeder funnet</p>
              )}
              {chains.map((chain) => (
                <div key={chain.name} className="flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: chain.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900">{chain.name}</p>
                      <span className="text-xs text-zinc-400">{chain.storeCount} butikker</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: chain.totalScreens > 0 ? `${(chain.onlineScreens / chain.totalScreens) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{chain.onlineScreens}/{chain.totalScreens} online</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2 text-zinc-500" asChild>
                <Link href="/admin/stores">
                  Se alle butikker <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Skjermstatus</CardTitle>
                <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
                  <Link href="/admin/screens">Se alle <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {screens.length === 0 && (
                <div className="text-center py-8">
                  <Monitor className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Ingen skjermer registrert ennå</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/admin/settings">Registrer første skjerm</Link>
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {screens.map((screen) => {
                  const color = getScreenStatusColor(screen.status, screen.last_heartbeat)
                  const bgMap = { green: "bg-emerald-50 border-emerald-100", yellow: "bg-amber-50 border-amber-100", red: "bg-red-50 border-red-100" }
                  const storeName = (screen.stores as { name: string } | null)?.name ?? "Ukjent"
                  return (
                    <div key={screen.id} className={`rounded-lg p-2.5 border text-center ${bgMap[color]}`}>
                      <ScreenStatusDot status={screen.status} lastHeartbeat={screen.last_heartbeat} size="sm" />
                      <p className="text-[10px] font-medium text-zinc-700 leading-tight mt-1.5">{storeName}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{formatLastSeen(screen.last_heartbeat)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Siste aktivitet */}
        {activityLog && activityLog.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4 uppercase tracking-widest">Siste aktivitet</h2>
            <div className="space-y-3">
              {activityLog.map((entry) => {
                const actionLabels: Record<string, { label: string; color: string }> = {
                  published: { label: "Publisert", color: "text-emerald-600" },
                  scheduled: { label: "Planlagt", color: "text-cyan-600" },
                  approved: { label: "Godkjent", color: "text-blue-600" },
                  rejected: { label: "Avvist", color: "text-red-500" },
                  submitted_for_approval: { label: "Sendt til godkjenning", color: "text-amber-600" },
                  rolled_back: { label: "Angret", color: "text-orange-500" },
                  auto_published: { label: "Autopublisert", color: "text-emerald-600" },
                }
                const cfg = actionLabels[entry.action] ?? { label: entry.action, color: "text-zinc-500" }
                const contentTitle = (entry.content_items as { title: string } | null)?.title ?? "—"
                const userName = (entry.users as { full_name: string } | null)?.full_name ?? "System"
                const time = entry.created_at
                  ? new Date(entry.created_at).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—"

                return (
                  <div key={entry.id} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                    <span className={`font-medium ${cfg.color} flex-shrink-0`}>{cfg.label}</span>
                    <span className="text-zinc-700 truncate flex-1">{contentTitle}</span>
                    <span className="text-zinc-400 flex-shrink-0">{userName}</span>
                    <span className="text-zinc-300 text-xs flex-shrink-0">{time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
