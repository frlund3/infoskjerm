import { Star } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const DEMO_REVIEWS = [
  { name: "Kari N.", rating: 5, text: "Fantastisk service og alltid ferske varer!" },
  { name: "Ole P.", rating: 5, text: "Ryddig butikk med hyggelig personale." },
  { name: "Anne L.", rating: 4, text: "God utvalg og konkurransedyktige priser." },
]
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
      ))}
    </div>
  )
}
export function GoogleReviewsModule({ fields }: Props) {
  const businessName = (fields.business_name as string) || 'Butikken'
  return (
    <div className="flex flex-col h-full bg-zinc-950 px-14 py-12">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">{businessName}</h2>
      </div>
      <div className="flex items-center gap-3 mb-8">
        <span className="text-5xl font-black text-white">4.8</span>
        <div>
          <Stars rating={5} />
          <p className="text-zinc-400 text-sm mt-1">Basert på Google-anmeldelser</p>
        </div>
      </div>
      <div className="space-y-4">
        {DEMO_REVIEWS.map((r, i) => (
          <div key={i} className="bg-zinc-900 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{r.name}</span>
              <Stars rating={r.rating} />
            </div>
            <p className="text-zinc-300 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
