import { Cake } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function BirthdayAnnouncementModule({ fields }: Props) {
  const name = (fields.name as string) || 'Ola Nordmann'
  const message = (fields.message as string) || 'Gratulerer med dagen! 🎉'
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-zinc-950 to-zinc-900 text-center px-16">
      <div className="relative mb-8">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-40 h-40 rounded-full object-cover border-4 border-amber-400/50" />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white text-5xl font-black">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
          <Cake className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="mt-6">
        <p className="text-zinc-400 text-lg uppercase tracking-widest mb-3">Gratulerer med dagen</p>
        <h2 className="text-5xl font-black text-white mb-6">{name}</h2>
        <p className="text-xl text-zinc-300 leading-relaxed max-w-2xl">{message}</p>
      </div>
      <div className="flex gap-3 mt-8 text-4xl">
        {'🎂 🎉 🎈 🎁'.split(' ').map((e, i) => <span key={i}>{e}</span>)}
      </div>
    </div>
  )
}
