import { Sparkles } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function ProductSpotlightModule({ fields }: Props) {
  const productName = (fields.product_name as string) || 'Produktnavn'
  const description = (fields.description as string) || ''
  const price = (fields.price as string) || ''
  const originalPrice = (fields.original_price as string) || ''
  const imageUrl = (fields.image_url as string) || null
  const badge = (fields.badge as string) || ''
  return (
    <div className="flex flex-col justify-center h-full bg-zinc-950 px-16 py-12">
      <div className="flex items-start justify-between gap-10">
        <div className="flex-1">
          {badge && (
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold text-sm uppercase tracking-widest">{badge}</span>
            </div>
          )}
          <h2 className="text-5xl font-black text-white mb-4 leading-tight">{productName}</h2>
          {description && <p className="text-xl text-zinc-300 mb-8 leading-relaxed">{description}</p>}
          <div className="flex items-baseline gap-4">
            {price && <span className="text-5xl font-black text-white">{price}</span>}
            {originalPrice && <span className="text-2xl text-zinc-500 line-through">{originalPrice}</span>}
          </div>
        </div>
        {imageUrl && (
          <div className="w-80 h-80 rounded-3xl overflow-hidden border border-white/10 flex-shrink-0">
            <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  )
}
