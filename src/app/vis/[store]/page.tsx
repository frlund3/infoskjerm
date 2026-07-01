import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata, Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"
import { kioskCookieName, kioskCookieValid } from "@/lib/kiosk/auth"
import { KioskGate } from "./kiosk-gate"
import { KioskStage } from "./kiosk-stage"
import { KioskAuto } from "./kiosk-auto"

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
  searchParams: Promise<{ type?: string; orientation?: string; avdeling?: string }>
}) {
  const { store } = await params
  const { type, orientation, avdeling } = await searchParams
  const row = await resolveStore(store)
  if (!row) notFound()

  // Avdeling-filter (valgfritt) — «felles» er standard og trenger ikke sendes.
  const avd = avdeling && avdeling !== "felles" ? `&avdeling=${encodeURIComponent(avdeling)}` : ""

  // Privat visning: krev passord når enheten har satt ett og cookie mangler/ugyldig.
  if (row.kiosk_password_hash) {
    const jar = await cookies()
    const cookie = jar.get(kioskCookieName(row.id))?.value
    if (!kioskCookieValid(cookie, row.id, row.kiosk_password_hash)) {
      return <KioskGate storeId={row.id} storeName={row.name} />
    }
  }

  // Hjelper: velg mal etter eksplisitt ?orientation, ellers AUTO etter enhetens
  // faktiske orientering. Samme oppførsel for både intern- og kundeskjerm.
  const explicitPortrait = orientation === "staaende" || orientation === "stående" || orientation === "portrait"
  const explicitLandscape = orientation === "liggende" || orientation === "landscape"

  // Intern skjerm (verksted/pauserom) via ?type=intern → FULL bakrom-rotasjon
  // (internt innhold + butikk-KPI + KPI-oversikt uke/år), akkurat som en ekte
  // internskjerm. Auto-orientering: liggende internskjerm → 1920×1080, stående
  // (f.eks. telefon på Mobile AS) → 1080×1920. Widgetene inne i bakrom oppdager
  // selv orienteringen fra sin iframe-viewport og velger stående/liggende layout.
  if (type === "intern") {
    const p = { src: `/widget/bakrom?store=${row.id}${avd}`, width: 1080, height: 1920 }
    const l = { src: `/widget/bakrom?store=${row.id}${avd}`, width: 1920, height: 1080 }
    if (explicitPortrait) return <KioskStage src={p.src} title={row.name} width={p.width} height={p.height} />
    if (explicitLandscape) return <KioskStage src={l.src} title={row.name} width={l.width} height={l.height} />
    return <KioskAuto portrait={p} landscape={l} title={row.name} />
  }

  // Kundeskjerm i to native orienteringer: stående (tilbud, 1080×1920) og
  // liggende (premium kampanjemal, 1920×1080). KioskStage skalerer hver til
  // å passe enheten.
  const portraitVariant = { src: `/widget/tilbud?store=${row.id}${avd}`, width: 1080, height: 1920 }
  const landscapeVariant = { src: `/widget/kampanje?store=${row.id}${avd}`, width: 1920, height: 1080 }

  // Eksplisitt ?orientation i URL-en overstyrer (for skjermer montert fast i én
  // retning). Uten den: AUTO — fyll etter enhetens faktiske orientering.
  const explicit = explicitLandscape ? landscapeVariant : explicitPortrait ? portraitVariant : null

  if (explicit) {
    return <KioskStage src={explicit.src} title={row.name} width={explicit.width} height={explicit.height} />
  }

  return <KioskAuto portrait={portraitVariant} landscape={landscapeVariant} title={row.name} />
}
