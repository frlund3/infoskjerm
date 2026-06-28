import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Plus, Monitor, CheckCircle2, XCircle, Settings2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getScreensWithStore, getScreenStatusColor } from "@/lib/admin/queries"
import { ScreenMapClient } from "./_components/screen-map-client"

export const dynamic = "force-dynamic"

export default async function ScreensPage() {
  const supabase = await createClient()
  const rawScreens = await getScreensWithStore(supabase)

  const online = rawScreens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "green"
  ).length
  const offline = rawScreens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "red"
  ).length
  const maintenance = rawScreens.filter((s) => s.status === "maintenance").length

  // Map to the shape ScreenMapClient expects, casting nested Supabase relation
  type StoreWithChain = {
    name: string
    chains: { name: string; color: string } | null
  } | null

  const screens = rawScreens.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status ?? null,
    last_heartbeat: s.last_heartbeat,
    last_seen_at: s.last_seen_at,
    pending_command: s.pending_command,
    power_state: s.power_state,
    app_info: s.app_info,
    stores: s.stores as unknown as StoreWithChain,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermer"
        subtitle={`${online} online · ${offline} offline · ${maintenance} vedlikehold`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/screens/new">
              <Plus className="w-4 h-4" />
              Ny skjerm
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: CheckCircle2, label: "Online", count: online, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: XCircle, label: "Offline", count: offline, color: "text-red-600", bg: "bg-red-50" },
            { icon: Settings2, label: "Vedlikehold", count: maintenance, color: "text-zinc-500", bg: "bg-zinc-100" },
            { icon: Monitor, label: "Totalt", count: rawScreens.length, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ icon: Icon, label, count, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-zinc-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{count}</p>
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live map */}
        <ScreenMapClient screens={screens} />
      </div>
    </div>
  )
}
