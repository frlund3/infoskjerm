import { Award } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function LoyaltyProgramModule({ fields }: Props) {
  const title = (fields.title as string) || 'Fordelsclub'
  const description = (fields.description as string) || 'Bli med i vår fordelsclub og spar på hvert kjøp!'
  const pointsLabel = (fields.points_label as string) || 'Bonus-poeng'
  const cta = (fields.cta as string) || 'Registrer deg i dag'
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex flex-col justify-center h-full bg-zinc-950 px-16 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Award className="w-7 h-7 text-amber-400" />
        </div>
        <span className="text-amber-400 font-semibold text-lg uppercase tracking-widest">Lojalitetsprogram</span>
      </div>
      <div className="flex gap-12 items-center">
        <div className="flex-1">
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">{title}</h2>
          <p className="text-xl text-zinc-300 mb-8 leading-relaxed">{description}</p>
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4">
              <p className="text-amber-400 text-sm mb-1">{pointsLabel}</p>
              <p className="text-white text-2xl font-bold">+10 poeng per 100 kr</p>
            </div>
          </div>
          <div className="mt-8 bg-white rounded-2xl px-8 py-4 inline-block">
            <p className="text-zinc-900 font-bold text-xl">{cta}</p>
          </div>
        </div>
        {imageUrl && <img src={imageUrl} alt={title} className="w-64 h-64 object-cover rounded-3xl border border-white/10 flex-shrink-0" />}
      </div>
    </div>
  )
}
