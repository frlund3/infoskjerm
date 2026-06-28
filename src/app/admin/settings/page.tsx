import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { DevicesPanel, type ScreenRow } from "./devices-panel"
import { BrandingPanel } from "./branding-panel"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = await createClient()

  const [{ data: screens }, { data: stores }, { data: chains }] = await Promise.all([
    supabase
      .from("screens")
      .select("id, name, token, status, power_state, pending_command, last_seen_at, app_info, stores(name)")
      .order("name"),
    supabase.from("stores").select("id, name").order("name"),
    supabase
      .from("chains")
      .select("id, name, color, brand_light, brand_fg")
      .order("name"),
  ])

  const rows: ScreenRow[] = (screens ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    token: s.token,
    status: s.status,
    power_state: s.power_state,
    pending_command: s.pending_command,
    last_seen_at: s.last_seen_at,
    app_info: s.app_info,
    store_name: (s.stores as { name: string } | null)?.name ?? "—",
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Innstillinger" subtitle="Skjermer, fjernstyring og systemkonfigurasjon" />

      <div className="flex-1 p-6 space-y-6">
        <DevicesPanel screens={rows} stores={stores ?? []} />

        {chains && chains.length > 0 && (
          <BrandingPanel
            chains={chains.map((c) => ({
              id: c.id,
              name: c.name,
              color: c.color,
              brand_light: c.brand_light,
              brand_fg: c.brand_fg,
            }))}
          />
        )}

        {/* Setup instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              Oppsett av Raspberry Pi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-zinc-950 rounded-xl p-5 font-mono text-sm space-y-2">
              <p className="text-zinc-400 text-xs"># Kjør på en fersk Raspberry Pi OS Lite (64-bit):</p>
              <p className="text-emerald-400 break-all">
                curl -sSL https://raw.githubusercontent.com/frlund3/infoskjerm/main/pi/setup.sh | sudo SCREEN_TOKEN=<span className="text-amber-400">din-token</span> bash
              </p>
              <p className="text-zinc-500 text-xs mt-2"># Pi-en booter rett inn i fullskjerm og melder seg online her.</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-zinc-600">
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">Maskinvare</p>
                <p>Raspberry Pi 4B 4GB</p>
                <p>TV med HDMI-CEC</p>
                <p>32GB microSD</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">Fjernstyring</p>
                <p>På / Av (HDMI-CEC)</p>
                <p>Reload av innhold</p>
                <p>Puls hvert 30. sek</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">Nettverk</p>
                <p>Ethernet eller WiFi</p>
                <p>Kun utgående (port 443)</p>
                <p>Ingen åpne porter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
