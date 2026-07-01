import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata, Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"
import { kioskCookieName, kioskCookieValid } from "@/lib/kiosk/auth"
import { KioskGate } from "./kiosk-gate"

/**
 * «Telefon/nettbrett som skjerm» — en offentlig kiosk-URL du åpner på en
 * telefon, nettbrett eller PC og setter i fullskjerm. Den speiler nøyaktig det
 * en fysisk skjerm (Raspberry Pi) viser: full-skjerm kundeskjerm (/widget/tilbud)
 * — eller intern skjerm med ?type=intern (/widget/bakrom). Ingen Pi/Xibo nødvendig.
 *
 * Bruk:  /vis/<butikk-id>   eller   /vis/Mobile%20Oslo   (+ ?type=intern)
 * Valgfritt passord per enhet (privat visning). Låst mot zoom/scroll (100dvh).
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

type KioskStore = { id: string; name: string; kiosk_password_hash: string | null }

/** Slår opp butikk på id (UUID) eller eksakt/likt navn — service-role, ingen innlogging. */
async function resolveStore(param: string): Promise<KioskStore | null> {
  const key = decodeURIComponent(param).trim()
  if (!key) return null
  const supabase = createAdminClient()
  const base = supabase.from("stores").select("id, name, kiosk_password_hash")
  const { data } = UUID_RE.test(key)
    ? await base.eq("id", key).maybeSingle()
    : await base.ilike("name", key).maybeSingle()
  return (data as KioskStore | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store } = await params
  const row = await resolveStore(store)
  return { title: row ? `${row.name} – Infoskjerm` : "Infoskjerm" }
}

export default async function KioskPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { store } = await params
  const { type } = await searchParams
  const row = await resolveStore(store)
  if (!row) notFound()

  // Privat visning: krev passord når enheten har satt ett og cookie mangler/ugyldig.
  if (row.kiosk_password_hash) {
    const jar = await cookies()
    const cookie = jar.get(kioskCookieName(row.id))?.value
    if (!kioskCookieValid(cookie, row.id, row.kiosk_password_hash)) {
      return <KioskGate storeId={row.id} storeName={row.name} />
    }
  }

  // Intern skjerm (verksted/pauserom) via ?type=intern → ren intern nyhetsflate
  // (uten dagligvare-KPI). Ellers kundeskjerm.
  const widget = type === "intern"
    ? `/widget/nyheter?store=${row.id}&flate=intern`
    : `/widget/tilbud?store=${row.id}`

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", overflow: "hidden" }}>
      <iframe
        src={widget}
        title={row.name}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
        allow="fullscreen"
      />
    </div>
  )
}
