import { Leaf } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function SustainabilityInfoModule({ fields }: Props) {
  const title = (fields.title as string) || 'Bærekraft'
  const metric = (fields.metric as string) || ''
  const metricLabel = (fields.metric_label as string) || ''
  const description = (fields.description as string) || ''
  const goal = (fields.goal as string) || ''
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex flex-col justify-center h-full bg-gradient-to-br from-emerald-950 to-zinc-950 px-16 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Leaf className="w-7 h-7 text-emerald-400" />
        </div>
        <span className="text-emerald-400 font-semibold text-lg uppercase tracking-widest">Bærekraft</span>
      </div>
      <div className="flex gap-12 items-start">
        <div className="flex-1">
          <h2 className="text-5xl font-black text-white mb-4 leading-tight">{title}</h2>
          {metric && (
            <div className="mb-6">
              <span className="text-6xl font-black text-emerald-400">{metric}</span>
              {metricLabel && <p className="text-zinc-400 text-lg mt-2">{metricLabel}</p>}
            </div>
          )}
          {description && <p className="text-xl text-zinc-300 leading-relaxed mb-6">{description}</p>}
          {goal && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4">
              <p className="text-zinc-400 text-sm mb-1 uppercase tracking-wide">Mål</p>
              <p className="text-emerald-300 text-xl font-semibold">{goal}</p>
            </div>
          )}
        </div>
        {imageUrl && <img src={imageUrl} alt={title} className="w-72 h-72 rounded-3xl object-cover border border-white/10 flex-shrink-0" />}
      </div>
    </div>
  )
}
