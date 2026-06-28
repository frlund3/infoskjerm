import { Button } from "@/components/ui/button"
import { Topbar } from "@/components/admin/topbar"
import { createContentItem } from "./actions"
import { Newspaper, Trophy, BarChart2, CloudSun, Zap, LayoutTemplate, ArrowRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

// Optional one-click quick-starts: each opens the builder with one module
// already placed in the main zone. Not a mandatory choice — you can always
// start blank and add any modules you want.
const QUICK_STARTS = [
  { key: "news", label: "Nyhet", desc: "Intern beskjed eller nyhet", icon: Newspaper, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "weather", label: "Vær", desc: "Lokalvær fra Yr.no", icon: CloudSun, color: "bg-sky-50 border-sky-200 text-sky-700" },
  { key: "stats", label: "Salgstall", desc: "Dagsomsetning og budsjett", icon: BarChart2, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { key: "competition", label: "Konkurranse", desc: "Leaderboard og premie", icon: Trophy, color: "bg-amber-50 border-amber-200 text-amber-700" },
] as const

type ContentTemplate = {
  id: string
  name: string
  description: string | null
  type: string
}

const TYPE_LABELS: Record<string, string> = {
  news: "Nyhet", competition: "Konkurranse", stats: "Salgstall", weather: "Vær", slide: "Slide",
}

export default async function NewContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let templates: ContentTemplate[] = []
  if (user) {
    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (profile?.tenant_id) {
      const { data } = await supabase
        .from("content_templates")
        .select("id, name, description, type")
        .or(`is_global.eq.true,tenant_id.eq.${profile.tenant_id}`)
        .order("sort_order")
      templates = (data ?? []) as ContentTemplate[]
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Ny skjerm"
        subtitle="Lag en skjerm fra bunnen av, eller start med en ferdig modul"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/content">Avbryt</Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-2xl space-y-8">
        {/* PRIMARY: build from scratch */}
        <section className="rounded-2xl border-2 border-zinc-900 bg-white p-6">
          <h2 className="text-base font-bold text-zinc-900">Lag en skjerm fra bunnen av</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Gi skjermen et navn, så åpner builderen med et tomt lerret. Der velger du
            layout og legger inn akkurat de modulene du vil — én eller flere på samme skjerm.
          </p>
          <form action={createContentItem} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="type" value="slide" />
            <input
              name="title"
              type="text"
              placeholder="F.eks. «Inngangsskjerm» eller «Kantine»"
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
            <Button type="submit" className="flex-shrink-0">
              Åpne builder
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </section>

        {/* SECONDARY: quick-start with a module */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Eller start med en ferdig modul</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_STARTS.map(({ key, label, desc, icon: Icon, color }) => (
              <form key={key} action={createContentItem}>
                <input type="hidden" name="type" value={key} />
                <input type="hidden" name="title" value={label} />
                <button
                  type="submit"
                  className="w-full flex items-center gap-3.5 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors flex-shrink-0" />
                </button>
              </form>
            ))}
          </div>
        </section>

        {/* Templates */}
        {templates.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Maler</h2>
              <span className="text-xs text-zinc-400">— forhåndsutfylt innhold klar til bruk</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <form key={tpl.id} action={createContentItem}>
                  <input type="hidden" name="title" value={tpl.name} />
                  <input type="hidden" name="type" value={tpl.type} />
                  <input type="hidden" name="template_id" value={tpl.id} />
                  <button
                    type="submit"
                    className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">{tpl.name}</p>
                      <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                        {TYPE_LABELS[tpl.type] ?? tpl.type}
                      </span>
                    </div>
                    {tpl.description && <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{tpl.description}</p>}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <LayoutTemplate className="w-3.5 h-3.5" />
          Tips: I builderen kan du dele skjermen i soner og vise flere moduler samtidig.
        </p>
      </div>
    </div>
  )
}
