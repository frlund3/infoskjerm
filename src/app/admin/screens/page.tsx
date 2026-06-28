import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScreenStatusDot } from "@/components/admin/screen-status-dot"
import { Monitor, Plus, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getScreensWithStore, formatLastSeen, getScreenStatusColor } from "@/lib/admin/queries"
import { CopyTokenButton } from "./_components/copy-token-button"
import { ScreenActionButton } from "./_components/screen-action-button"

export const dynamic = "force-dynamic"

export default async function ScreensPage() {
  const supabase = await createClient()
  const screens = await getScreensWithStore(supabase)

  const online = screens.filter((s) => getScreenStatusColor(s.status, s.last_heartbeat) !== "red").length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermer"
        subtitle={`${online} av ${screens.length} online`}
        actions={
          <Button size="sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }} asChild>
            <Link href="/admin/settings">
              <Plus className="w-4 h-4" />
              Ny skjerm
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{online}</p>
                <p className="text-xs text-zinc-500">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{screens.length - online}</p>
                <p className="text-xs text-zinc-500">Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{screens.length}</p>
                <p className="text-xs text-zinc-500">Totalt</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Butikk</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Navn</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Sist sett</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Token</th>
                  <th className="text-right p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {screens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400">
                      <Monitor className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                      <p>Ingen skjermer registrert ennå</p>
                    </td>
                  </tr>
                )}
                {screens.map((screen) => {
                  type StoreWithChain = { name: string; chains: { name: string; color: string } | null } | null
                  const store = screen.stores as unknown as StoreWithChain
                  return (
                    <tr key={screen.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <ScreenStatusDot status={screen.status} lastHeartbeat={screen.last_heartbeat} showLabel size="md" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {store?.chains && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.chains.color }} />
                          )}
                          <span className="font-medium text-zinc-900">{store?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600">{screen.name}</td>
                      <td className="p-4 text-zinc-500 hidden lg:table-cell">{formatLastSeen(screen.last_heartbeat)}</td>
                      <td className="p-4 hidden xl:table-cell">
                        <CopyTokenButton token={screen.token} />
                      </td>
                      <td className="p-4 text-right">
                        <ScreenActionButton screenId={screen.id} action="reload" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
