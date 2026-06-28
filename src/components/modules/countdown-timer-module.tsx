'use client'
import { Timer } from 'lucide-react'
import { useState, useEffect } from 'react'
interface Props { fields: Record<string, unknown> }
function pad(n: number): string { return String(n).padStart(2, '0') }
export function CountdownTimerModule({ fields }: Props) {
  const title = (fields.title as string) || 'Nedtelling'
  const subtitle = (fields.subtitle as string) || ''
  const targetDate = (fields.target_date as string) || ''
  const [diff, setDiff] = useState<{ d: number; h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    function calc() {
      if (!targetDate) return
      const delta = new Date(targetDate).getTime() - Date.now()
      if (delta <= 0) { setDiff({ d: 0, h: 0, m: 0, s: 0 }); return }
      const d = Math.floor(delta / 86400000)
      const h = Math.floor((delta % 86400000) / 3600000)
      const m = Math.floor((delta % 3600000) / 60000)
      const s = Math.floor((delta % 60000) / 1000)
      setDiff({ d, h, m, s })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [targetDate])

  const units = diff ? [
    { v: diff.d, l: 'Dager' },
    { v: diff.h, l: 'Timer' },
    { v: diff.m, l: 'Min' },
    { v: diff.s, l: 'Sek' },
  ] : []

  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-center px-16">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
        <Timer className="w-7 h-7 text-cyan-400" />
      </div>
      <h2 className="text-4xl font-black text-white mb-2">{title}</h2>
      {subtitle && <p className="text-zinc-400 text-xl mb-10">{subtitle}</p>}
      {diff ? (
        <div className="flex gap-6">
          {units.map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center">
              <div className="w-28 h-28 bg-zinc-900 border border-zinc-700 rounded-3xl flex items-center justify-center mb-3">
                <span className="text-5xl font-black text-white tabular-nums">{pad(v)}</span>
              </div>
              <span className="text-zinc-500 text-sm uppercase tracking-widest">{l}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-xl">Ingen dato angitt</p>
      )}
    </div>
  )
}
