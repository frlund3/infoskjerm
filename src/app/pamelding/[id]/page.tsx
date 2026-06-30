import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { htmlToBlocks } from "@/lib/content/live"
import { SignupForm } from "./signup-form"
import { CalendarDays, MapPin, Clock } from "lucide-react"

/**
 * Public, festive event landing page reached by scanning the QR on an internal
 * screen. Shows the invitation (title, date, place, image, details) and a
 * built-in sign-up form that writes to event_signups. Branded in the chain's
 * colour when a ?store=<id> is supplied (the screen passes it on the QR).
 *
 * Usage: /pamelding/<contentItemId>?store=<storeId>
 */

export const dynamic = "force-dynamic"

const GOLD = "#f5c451"

interface ChainRow { name: string; color: string; logo_url: string | null }
interface InvBody {
  html?: string
  imageUrl?: string | null
  invitation?: { eventDate?: string | null; eventPlace?: string | null; signupEnabled?: boolean; signupDeadline?: string | null }
}

function formatEventDate(iso: string | null | undefined): { date: string; time: string | null } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(iso)
  const date = d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return {
    date: date.charAt(0).toUpperCase() + date.slice(1),
    time: hasTime ? d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : null,
  }
}

function deadlinePassed(iso: string | null | undefined): boolean {
  if (!iso) return false
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return false
  end.setHours(23, 59, 59, 999)
  return Date.now() > end.getTime()
}

export default async function PameldingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ store?: string }>
}) {
  const { id } = await params
  const { store } = await searchParams
  const supabase = createAdminClient()

  // The CMS live-preview points its QR here with a placeholder id, so scanning
  // it shows a friendly sample page instead of a 404.
  const isPreview = id === "forhandsvisning"

  const { data: dbItem } = isPreview
    ? { data: null }
    : await supabase.from("content_items").select("id, title, type, status, body").eq("id", id).maybeSingle()
  if (!isPreview && (!dbItem || dbItem.type !== "invitation")) notFound()

  const item = dbItem ?? {
    id: "forhandsvisning",
    title: "Slik ser påmeldingssiden ut",
    type: "invitation" as const,
    status: "live" as const,
    body: {
      html: "<p>Dette er en forhåndsvisning. Når du publiserer invitasjonen og noen skanner QR-koden på skjermen, kommer de hit og kan melde seg på.</p>",
      invitation: { eventDate: null, eventPlace: null, signupEnabled: true, signupDeadline: null },
    } as InvBody,
  }

  const body = (item.body ?? {}) as InvBody
  const inv = body.invitation ?? {}
  const blocks = htmlToBlocks(body.html ?? "")
  const when = formatEventDate(inv.eventDate)
  const image = body.imageUrl ?? null

  // Optional chain branding from the store the screen belongs to.
  const { data: storeRow } = store
    ? await supabase.from("stores").select("id, name, chains(name, color, logo_url)").eq("id", store).maybeSingle()
    : { data: null }
  const chain = storeRow?.chains as unknown as ChainRow | null
  const accent = chain?.color || GOLD
  const heroBg = "linear-gradient(150deg,#1a1333 0%,#3b1d63 55%,#7a2e62 100%)"

  const signupOpen = item.status === "live" && inv.signupEnabled !== false && !deadlinePassed(inv.signupDeadline)
  const closedReason =
    item.status !== "live" || inv.signupEnabled === false
      ? "Påmeldingen er ikke åpen."
      : deadlinePassed(inv.signupDeadline)
        ? "Påmeldingsfristen har gått ut."
        : null

  const deadlineText = inv.signupDeadline
    ? new Date(inv.signupDeadline).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
    : null

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Festive hero */}
      <section className="relative overflow-hidden px-6 pt-12 pb-28 text-white" style={{ background: heroBg }}>
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,196,81,.22), transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/20" />
        {["🎈", "🎊", "✨", "🥂"].map((e, i) => (
          <span key={i} className="absolute text-3xl opacity-80" style={{ left: `${12 + i * 24}%`, top: `${10 + (i % 2) * 16}%` }}>{e}</span>
        ))}
        <div className="relative mx-auto max-w-md">
          {chain?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chain.logo_url} alt={chain.name ?? ""} className="mb-6 h-10 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]" style={{ background: GOLD, color: "#1a1333" }}>
            🎉 Invitasjon
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{item.title}</h1>

          <div className="mt-6 space-y-2">
            {when && (
              <p className="flex items-center gap-3 text-lg text-white/90">
                <CalendarDays className="h-5 w-5 flex-shrink-0" style={{ color: GOLD }} /> {when.date}
              </p>
            )}
            {when?.time && (
              <p className="flex items-center gap-3 text-lg text-white/90">
                <Clock className="h-5 w-5 flex-shrink-0" style={{ color: GOLD }} /> kl. {when.time}
              </p>
            )}
            {inv.eventPlace && (
              <p className="flex items-center gap-3 text-lg text-white/90">
                <MapPin className="h-5 w-5 flex-shrink-0" style={{ color: GOLD }} /> {inv.eventPlace}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="relative mx-auto -mt-20 max-w-md px-6 pb-16">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="mb-6 w-full rounded-3xl object-cover shadow-xl" style={{ maxHeight: 240 }} />
        )}

        {blocks.length > 0 && (
          <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            {blocks.map((b, i) =>
              b.kind === "h" ? (
                <p key={i} className="mb-1 mt-3 text-lg font-bold text-zinc-900">{b.text}</p>
              ) : b.kind === "li" ? (
                <p key={i} className="flex gap-2 text-zinc-600"><span style={{ color: accent }}>•</span>{b.text}</p>
              ) : (
                <p key={i} className="mb-2 leading-relaxed text-zinc-600">{b.text}</p>
              )
            )}
          </div>
        )}

        {signupOpen ? (
          <SignupForm contentItemId={item.id} storeId={store ?? null} accent={accent} deadlineText={deadlineText} />
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
            <h2 className="text-xl font-extrabold text-zinc-900">Påmelding stengt</h2>
            <p className="mt-2 text-zinc-500">{closedReason}</p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-zinc-400">
          Opplysningene brukes kun til å administrere arrangementet, og slettes etterpå.
        </p>
      </div>
    </main>
  )
}
