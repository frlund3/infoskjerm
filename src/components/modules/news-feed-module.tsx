import { Rss } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const DEMO_ITEMS = [
  "SPAR-kjeden åpner 10 nye butikker i 2025",
  "Rekordresultat for dagligvarebransjen i Q1",
  "Nye bærekraftskrav fra myndighetene trer i kraft",
  "NorgesGruppen investerer i kortreist mat",
  "Sommerens bestselgere: grillvarer og is",
]
export function NewsFeedModule({ fields }: Props) {
  const title = (fields.title as string) || 'Nyheter'
  return (
    <div className="flex flex-col h-full bg-zinc-950 px-16 py-14">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Rss className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-4 flex-1">
        {DEMO_ITEMS.map((item, i) => (
          <div key={i} className="flex items-start gap-4 border-b border-zinc-800 pb-4">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2.5 flex-shrink-0" />
            <p className="text-zinc-200 text-lg leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
      {typeof fields.feed_url === 'string' && fields.feed_url && (
        <p className="text-zinc-600 text-xs mt-4 font-mono">{fields.feed_url}</p>
      )}
    </div>
  )
}
