import { notFound } from "next/navigation"
import type { Metadata, Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * «Telefon/nettbrett som skjerm» — en offentlig kiosk-URL du åpner på en
 * telefon, nettbrett eller PC og setter i fullskjerm. Den speiler nøyaktig det
 * en fysisk skjerm (Raspberry Pi) viser i stående format: full-skjerm
 * /widget/tilbud for butikken/forhandleren. Ingen Pi eller Xibo nødvendig.
 *
 * Bruk:  /vis/<butikk-id>   eller   /vis/Mobile%20Oslo
 * Låst mot zoom/scroll og fyller hele skjermen (100dvh, viewport-fit=cover).
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Slår opp butikk på id (UUID) eller eksakt/likt navn — service-role, ingen innlogging. */
async function resolveStore(param: string): Promise<{ id: string; name: string } | null> {
  const key = decodeURIComponent(param).trim()
  if (!key) return null
  const supabase = createAdminClient()
  const base = supabase.from("stores").select("id, name")
  const { data } = UUID_RE.test(key)
    ? await base.eq("id", key).maybeSingle()
    : await base.ilike("name", key).maybeSingle()
  return (data as { id: string; name: string } | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store } = await params
  const row = await resolveStore(store)
  return { title: row ? `${row.name} – Infoskjerm` : "Infoskjerm" }
}

export default async function KioskPage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params
  const row = await resolveStore(store)
  if (!row) notFound()

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", overflow: "hidden" }}>
      <iframe
        src={`/widget/tilbud?store=${row.id}`}
        title={row.name}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
        allow="fullscreen"
      />
    </div>
  )
}
