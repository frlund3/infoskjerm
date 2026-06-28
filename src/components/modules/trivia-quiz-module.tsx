'use client'
import { HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
interface Props { fields: Record<string, unknown> }
export function TriviaQuizModule({ fields }: Props) {
  const question = (fields.question as string) || 'Hva er Norges lengste elv?'
  const answers = [
    { key: 'A', text: (fields.answer_a as string) || 'Glomma' },
    { key: 'B', text: (fields.answer_b as string) || 'Lågen' },
    { key: 'C', text: (fields.answer_c as string) || '' },
    { key: 'D', text: (fields.answer_d as string) || '' },
  ].filter(a => a.text)
  const correct = (fields.correct as string) || 'A'
  const revealAfter = Number(fields.reveal_after) || 15
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), revealAfter * 1000)
    return () => clearTimeout(t)
  }, [revealAfter])

  const colors: Record<string, string> = { A: 'from-blue-600 to-blue-700', B: 'from-violet-600 to-violet-700', C: 'from-amber-500 to-amber-600', D: 'from-emerald-600 to-emerald-700' }

  return (
    <div className="flex flex-col justify-center h-full bg-zinc-950 px-16 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-purple-400" />
        </div>
        <span className="text-purple-400 font-semibold text-lg uppercase tracking-widest">Trivia</span>
      </div>
      <h2 className="text-4xl font-black text-white mb-10 leading-tight">{question}</h2>
      <div className="grid grid-cols-2 gap-4">
        {answers.map(a => (
          <div
            key={a.key}
            className={`bg-gradient-to-r ${colors[a.key] ?? 'from-zinc-700 to-zinc-800'} rounded-2xl p-5 relative overflow-hidden transition-all ${revealed && a.key === correct ? 'ring-4 ring-white ring-offset-2 ring-offset-zinc-950 scale-105' : ''}`}
          >
            <span className="text-white/60 text-sm font-bold mb-1 block">{a.key}</span>
            <span className="text-white text-xl font-semibold">{a.text}</span>
            {revealed && a.key === correct && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-sm font-black">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {!revealed && (
        <p className="text-zinc-500 text-sm mt-8 text-center">Svaret vises om {revealAfter} sekunder...</p>
      )}
    </div>
  )
}
