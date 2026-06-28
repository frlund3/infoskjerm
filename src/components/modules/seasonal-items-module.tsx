import { Leaf } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const SEASON_GRADIENTS: Record<string, string> = {
  Vår: 'from-emerald-900 to-emerald-800',
  Sommer: 'from-amber-900 to-yellow-800',
  Høst: 'from-orange-900 to-red-900',
  Vinter: 'from-blue-950 to-indigo-900',
  Påske: 'from-yellow-900 to-amber-800',
  Jul: 'from-red-950 to-green-900',
  '17.mai': 'from-blue-900 to-red-900',
}
export function SeasonalItemsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Sesongvarer'
  const season = (fields.season as string) || 'Sommer'
  const description = (fields.description as string) || ''
  const imageUrl = (fields.image_url as string) || null
  const gradient = SEASON_GRADIENTS[season] ?? 'from-zinc-900 to-zinc-800'
  return (
    <div className={`flex flex-col justify-center h-full bg-gradient-to-br ${gradient} px-16 py-12`}>
      <div className="flex items-center gap-4 mb-6">
        <Leaf className="w-8 h-8 text-white/60" />
        <span className="text-white/60 font-semibold text-lg uppercase tracking-widest">{season}</span>
      </div>
      <div className="flex gap-10 items-center">
        <div className="flex-1">
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">{title}</h2>
          {description && <p className="text-xl text-white/70 leading-relaxed">{description}</p>}
        </div>
        {imageUrl && <img src={imageUrl} alt={title} className="w-72 h-72 rounded-3xl object-cover border border-white/10 flex-shrink-0" />}
      </div>
    </div>
  )
}
