import { notFound } from "next/navigation"
import type { Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"

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

/** Bygger widget-URL fra skjermens tildeling. */
function widgetFor(row: ScreenRow): string {
  const store = row.store_id ?? ""
  const avdeling = row.avdeling || "felles"
  const landscape = row.orientation === "landscape" || row.orientation === "liggende"
  const q = `store=${store}&avdeling=${encodeURIComponent(avdeling)}`
  if (row.flate === "intern") {
    // Intern flate: ren intern nyhetsflate (uten dagligvare-KPI). Liggende variant
    // deler samme widget inntil egen liggende intern-mal er bygget.
    return `/widget/nyheter?${q}&flate=intern`
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
    .select("store_id, flate, avdeling, orientation")
    .eq("token", token)
    .maybeSingle()
  const row = data as ScreenRow | null
  if (!row) notFound()

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", overflow: "hidden" }}>
      <iframe
        src={widgetFor(row)}
        title="Skjerm"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
        allow="fullscreen"
      />
    </div>
  )
}
