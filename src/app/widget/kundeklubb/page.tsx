import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/server"
import { KundeklubbCard } from "@/app/widget/_shared/kundeklubb-card"

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/**
 * Full-screen customer-club invite for a store screen: store-branded, with a QR
 * code pointing to that store's /klubb/<store> sign-up landing page. Sized in
 * vmin so it fills portrait customer screens. Provision per store with
 * scripts/xibo/build-widget-layout.mjs.
 *
 * Usage: /widget/kundeklubb?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface ChainRow { name: string; color: string; logo_url: string | null }

export default async function KundeklubbWidget({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const supabase = createAdminClient()
  const { data } = store
    ? await supabase.from("stores").select("id, name, kundeklubb_url, kundeklubb_headline, kundeklubb_subtext, chains(name, color, logo_url)").eq("id", store).maybeSingle()
    : { data: null }

  const chain = (data?.chains as unknown as ChainRow | null)
  const accent = chain?.color || "#16a34a"
  const logo = chain?.logo_url ?? null
  const headline = data?.kundeklubb_headline || "Bli medlem – det er gratis"
  const subtext = data?.kundeklubb_subtext || "Medlemspriser, bonus og ukens beste tilbud."
  const url = data?.kundeklubb_url ? normalizeUrl(data.kundeklubb_url) : ""
  const qr = url ? await QRCode.toDataURL(url, { margin: 1, width: 700, color: { dark: "#0a0a0a", light: "#ffffff" } }) : ""

  return (
    <main style={{ margin: 0, width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      <KundeklubbCard headline={headline} subtext={subtext} qrUrl={qr} accent={accent} logoUrl={logo} chainName={chain?.name ?? null} />
    </main>
  )
}
