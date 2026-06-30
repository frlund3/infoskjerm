import { createAdminClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { JoinForm } from "./join-form"
import { Tag, Bell, Gift, Sparkles } from "lucide-react"

/**
 * Public, store-branded customer-club landing page reached by scanning the QR on
 * a store screen. Flashy hero in the chain's colour, member benefits, sign-up.
 *
 * Usage: /klubb/<storeId>
 */

export const dynamic = "force-dynamic"

interface ChainRow { name: string; color: string; logo_url: string | null }

const BENEFITS = [
  { icon: Tag, title: "Medlemspriser", text: "Eksklusive tilbud kun for medlemmer i butikken." },
  { icon: Gift, title: "Bonus & overraskelser", text: "Spar opp og få hyggelige medlemsfordeler." },
  { icon: Bell, title: "Først ute", text: "Få vite om ukens beste tilbud før alle andre." },
]

export default async function KlubbLandingPage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params
  const supabase = createAdminClient()
  // CMS live-preview points its QR here with a placeholder store id — show a
  // friendly sample page instead of a 404.
  const isPreview = store === "forhandsvisning"
  const { data: dbData } = isPreview
    ? { data: null }
    : await supabase.from("stores").select("id, name, chains(name, color, logo_url)").eq("id", store).maybeSingle()
  if (!isPreview && !dbData) notFound()

  const data = dbData ?? { id: "forhandsvisning", name: "butikken", chains: null }
  const chain = (data.chains as unknown as ChainRow | null)
  const accent = chain?.color || "#16a34a"
  const logo = chain?.logo_url ?? null

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-14 pb-24 text-white" style={{ background: `linear-gradient(150deg, ${accent}, #0a0a0a)` }}>
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-black/15" />
        <div className="relative mx-auto max-w-md">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={chain?.name ?? ""} className="mb-6 h-12 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <p className="mb-6 text-sm font-bold uppercase tracking-[0.3em] opacity-80">{chain?.name ?? "Gange-Rolv"}</p>
          )}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Kundeklubb
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Bli medlem i kundeklubben</h1>
          <p className="mt-3 text-lg text-white/80">{data.name} — medlemspriser, bonus og ukens beste tilbud rett i lomma.</p>
        </div>
      </section>

      {/* Card overlapping the hero */}
      <div className="relative mx-auto -mt-16 max-w-md px-6 pb-16">
        <JoinForm storeId={data.id} accent={accent} />

        <ul className="mt-8 space-y-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: accent }}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-zinc-900">{title}</p>
                <p className="text-sm text-zinc-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Ved å melde deg inn godtar du at {chain?.name ?? "butikken"} lagrer opplysningene for å sende deg medlemstilbud. Du kan melde deg av når som helst.
        </p>
      </div>
    </main>
  )
}
