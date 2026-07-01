import { notFound } from "next/navigation"
import type { Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"
import { ScaledScreen } from "./scaled-screen"

/**
 * ENHETS-STYRT skjerm-URL. Hver fysiske Raspberry Pi laster ÉN stabil URL
 * (/skjerm/<token>) via sin Xibo-layout. Denne siden slår opp skjermens
 * tildeling (flate + avdeling + orientering) og rendrer riktig widget.
 *
 * Konsekvens: alt styres fra vår admin. Endrer du flate/avdeling/orientering på
 * skjermen → Pi-en oppdaterer seg selv ved neste last. Vi rører aldri Pi-en
 * igjen, og en ny avdeling er bare en datarad — ingen omprogrammering.
 */

export const dynamic = "force-dynamic"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
}

type ScreenRow = {
  store_id: string | null
  flate: string | null
  avdeling: string | null
  orientation: string | null
}

/**
 * Bygger widget-URL fra skjermens tildeling. `grocery` = tenanten har dagligvare-
 * KPI (offerCards) → intern viser bakrom (KPI + intern nyheter), ellers ren
 * intern nyhetsflate (bil o.l.).
 */
function widgetFor(row: ScreenRow, grocery: boolean): string {
  const store = row.store_id ?? ""
  const avdeling = row.avdeling || "felles"
  const landscape = row.orientation === "landscape" || row.orientation === "liggende"
  const q = `store=${store}&avdeling=${encodeURIComponent(avdeling)}`
  if (row.flate === "intern") {
    return grocery ? `/widget/bakrom?${q}` : `/widget/nyheter?${q}&flate=intern`
  }
  // Kunde: liggende → premium kampanjemal, stående → tilbud/plakat.
  return landscape ? `/widget/kampanje?${q}` : `/widget/tilbud?${q}`
}

export default async function SkjermPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) notFound()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("screens")
    .select("store_id, tenant_id, flate, avdeling, orientation")
    .eq("token", token)
    .maybeSingle()
  const row = data as (ScreenRow & { tenant_id: string | null }) | null
  if (!row) notFound()

  const config = await getTenantConfig(supabase, row.tenant_id)
  const grocery = hasFeature(config.features, "offerCards")

  // Widgeten rendres i sin faste design-oppløsning og skaleres uniformt til vinduet
  // (se ScaledScreen). Slik ser laptop-testen identisk ut med Pi-en, og faste
  // pikselstørrelser i malene sprenger aldri i et lite vindu.
  const landscape = row.orientation === "landscape" || row.orientation === "liggende"

  return <ScaledScreen src={widgetFor(row, grocery)} landscape={landscape} />
}
