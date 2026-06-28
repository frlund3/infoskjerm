import { ImageIcon } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const PLACEHOLDER_COLORS = [
  'bg-gradient-to-br from-pink-500 to-purple-600',
  'bg-gradient-to-br from-amber-400 to-red-500',
  'bg-gradient-to-br from-emerald-400 to-cyan-500',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-rose-400 to-pink-600',
  'bg-gradient-to-br from-violet-500 to-purple-700',
]
export function InstagramWallModule({ fields }: Props) {
  const username = (fields.username as string) || '@butikken'
  const hashtag = (fields.hashtag as string) || ''
  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg">{username}</p>
          {hashtag && <p className="text-pink-400 text-sm">{hashtag}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {PLACEHOLDER_COLORS.map((cls, i) => (
          <div key={i} className={`${cls} rounded-xl flex items-center justify-center`}>
            <ImageIcon className="w-8 h-8 text-white/30" />
          </div>
        ))}
      </div>
    </div>
  )
}
