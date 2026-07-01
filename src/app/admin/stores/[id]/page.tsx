import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Mail, Monitor, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { KundeklubbSettings } from "../_components/kundeklubb-settings"
import { getTenantConfig } from "@/lib/tenant/config"
import { hasFeature } from "@/lib/tenant/features"

export const dynamic = "force-dynamic"

// GLN-plassholderen som brukes for enheter uten reelt EPD-lokasjonsnummer.
const GLN_PLACEHOLDER = "0000000000000"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StoreDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from("stores")
    .select("*, chains(name, color)")
    .eq("id", id)
    .single()

  if (!store) notFound()

  const chain = (store.chains as unknown as { name: string; color: string } | null)
  // GLN / EPD-lokasjonsnummer er dagligvare-spesifikt — vis kun for tenants som
  // har «gln»-funksjonen, og aldri plassholderverdien.
  const tenantConfig = await getTenantConfig(supabase, (store as { tenant_id: string | null }).tenant_id)
  const showGln = hasFeature(tenantConfig.features, "gln")
    && !!store.gln && store.gln !== GLN_PLACEHOLDER
  // Real screens from the engine (Xibo), not a local table — truthful status.
  const screensByStore = await fetchScreensByStore([{ id: store.id, name: store.name }])
  const screens = screensByStore.get(store.id) ?? []

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={store.name}
        subtitle={chain?.name ?? ""}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/stores">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Tilbake
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Store info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-zinc-900">Butikkinformasjon</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Selskapsnavn</p>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <p className="text-sm text-zinc-700">{store.company_name}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">E-post</p>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <p className="text-sm text-zinc-700">{store.email}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Org.nr</p>
                <p className="text-sm font-mono text-zinc-700">{store.org_number}</p>
              </div>
              {showGln && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">GLN</p>
                  <p className="text-sm font-mono text-zinc-700">{store.gln}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">By</p>
                <p className="text-sm text-zinc-700">{store.city}</p>
              </div>
              {store.latitude && store.longitude && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Koordinater</p>
                  <p className="text-sm font-mono text-zinc-700">{String(store.latitude)}°N, {String(store.longitude)}°Ø</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kundeklubb (per-store QR + toggle) */}
        <Card>
          <CardContent className="p-5">
            <KundeklubbSettings
              storeId={store.id}
              initial={{
                enabled: store.kundeklubb_enabled ?? false,
                url: store.kundeklubb_url ?? "",
                headline: store.kundeklubb_headline ?? "Bli medlem – det er gratis",
                subtext: store.kundeklubb_subtext ?? "Medlemspriser, bonus og ukens beste tilbud.",
                cta: store.kundeklubb_cta ?? "📱 Skann for å melde deg inn",
              }}
            />
          </CardContent>
        </Card>

        {/* Screens */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Skjermer</h2>
              <span className="text-xs text-zinc-400">{screens.length} skjerm{screens.length !== 1 ? "er" : ""}</span>
            </div>
            {screens.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">Ingen skjerm er koblet til denne butikken ennå. Når en skjerm kobles til skjermsystemet og tilordnes butikken, dukker den opp her.</p>
            ) : (
              screens.map((screen) => {
                const roleChip =
                  screen.role === "kunde"
                    ? "bg-sky-50 text-sky-700"
                    : screen.role === "bakrom"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-violet-50 text-violet-700"
                return (
                  <div key={screen.displayId} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                    <Monitor className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-800 truncate">{screen.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleChip}`}>{screen.roleLabel}</span>
                      </div>
                      <p className="text-xs text-zinc-400">Sist sett: {screen.lastSeen ?? "Aldri"}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${screen.online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {screen.online ? "Pålogget" : "Frakoblet"}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
