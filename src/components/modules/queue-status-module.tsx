import { Users } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function QueueStatusModule({ fields }: Props) {
  const title = (fields.title as string) || 'Kø-status'
  const currentNumber = Number(fields.current_number) || 42
  const serving = Number(fields.serving) || 38
  const waitMinutes = Number(fields.wait_minutes) || null
  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-center px-16">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
        <Users className="w-7 h-7 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-400 mb-10 uppercase tracking-widest">{title}</h2>
      <div className="flex gap-16 items-center">
        <div className="flex flex-col items-center">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">Betjener nå</p>
          <div className="w-48 h-48 bg-emerald-500/10 border-4 border-emerald-500/40 rounded-full flex items-center justify-center">
            <span className="text-7xl font-black text-emerald-400">{serving}</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">Ditt nummer</p>
          <div className="w-48 h-48 bg-zinc-900 border-4 border-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-7xl font-black text-white">{currentNumber}</span>
          </div>
          {waitMinutes && (
            <p className="text-zinc-400 mt-4 text-lg">~{waitMinutes} min ventetid</p>
          )}
        </div>
      </div>
    </div>
  )
}
