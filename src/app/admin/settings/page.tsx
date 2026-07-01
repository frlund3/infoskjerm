import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { BrandingPanel } from "./branding-panel"
import { NotificationsCard } from "./notifications-card"
import { BiometricCard } from "./biometric-card"
import { requireRole } from "@/lib/admin/require-role"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { tenantId } = await requireRole(["super_admin", "chain_manager", "store_manager"])
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userLabel = user?.email ?? "Infoskjerm-konto"

  const { data: chains } = await supabase
    .from("chains")
    .select("id, name, color, brand_light, brand_fg, logo_url")
    .eq("tenant_id", tenantId)
    .order("name")

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Innstillinger" subtitle="Merkevare og systemkonfigurasjon" />

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-4xl">
        {chains && chains.length > 0 && (
          <BrandingPanel
            chains={chains.map((c) => ({
              id: c.id,
              name: c.name,
              color: c.color,
              brand_light: c.brand_light,
              brand_fg: c.brand_fg,
              logo_url: c.logo_url,
            }))}
          />
        )}

        <NotificationsCard />

        <BiometricCard label={userLabel} />

        {/* Screens are managed by the screen engine (Xibo), not here */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              Skjermer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Skjermer, registrering og status styres i skjermsystemet. Hver Raspberry Pi
              kobles til skjermsystemet og legges i riktig butikk.
            </p>
            <Link
              href="/admin/cms"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-white px-3.5 py-2 rounded-lg"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <Monitor className="w-3.5 h-3.5" /> Gå til Skjermsystem
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
