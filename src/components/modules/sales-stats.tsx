"use client"
import { useState, useEffect, useRef } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Props { fields: Record<string, unknown> }

function AnimatedNumber({ target, duration = 1500, prefix = "", suffix = "" }: {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = null
    function animate(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return (
    <span className="tabular-nums">
      {prefix}{current.toLocaleString("nb-NO")}{suffix}
    </span>
  )
}

interface LiveData {
  actual?: number
  target?: number
  label?: string
  period?: string
  trend_percent?: number
}

export function SalesStatsModule({ fields }: Props) {
  const title = (fields.title as string) || "Salgstall"
  const dataSourceUrl = fields.data_source_url as string | null ?? null
  const refreshSeconds = Number(fields.refresh_interval ?? 30)

  const [liveData, setLiveData] = useState<LiveData | null>(null)

  useEffect(() => {
    if (!dataSourceUrl) return
    const proxyUrl = `/api/data-source?url=${encodeURIComponent(dataSourceUrl)}`
    async function fetchLive() {
      try {
        const res = await fetch(proxyUrl, { cache: "no-store" })
        if (res.ok) setLiveData(await res.json())
      } catch { /* silent */ }
    }
    fetchLive()
    const t = setInterval(fetchLive, refreshSeconds * 1000)
    return () => clearInterval(t)
  }, [dataSourceUrl, refreshSeconds])

  const period = liveData?.period ?? (fields.period as string) ?? "Dag"
  const actual = liveData?.actual ?? Number(fields.actual) ?? 0
  const target = liveData?.target ?? Number(fields.target) ?? 0
  const trendPercent = liveData?.trend_percent ?? Number(fields.trend_percent) ?? 0

  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const pctRounded = Math.round(target > 0 ? (actual / target) * 100 : 100)

  return (
    <div className="flex flex-col justify-between h-full bg-zinc-950 px-20 py-14 text-white">
      <div className="flex items-center gap-4">
        <span className="text-emerald-400 font-semibold text-lg uppercase tracking-widest">Salgstall — {period}</span>
      </div>

      <div>
        <h2 className="text-4xl font-black mb-6">{title}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Faktisk</p>
            <p className="text-6xl font-black text-emerald-400">
              <AnimatedNumber target={actual} duration={1500} />
            </p>
            <p className="text-zinc-500 text-sm mt-1">kr</p>
          </div>
          {target > 0 && (
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Mål</p>
              <p className="text-6xl font-black text-zinc-300">
                <AnimatedNumber target={target} duration={1200} />
              </p>
              <p className="text-zinc-500 text-sm mt-1">kr</p>
            </div>
          )}
        </div>
      </div>

      {target > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Budsjettoppnåelse</span>
            <span className={`font-bold ${pctRounded >= 100 ? "text-emerald-400" : pctRounded >= 80 ? "text-amber-400" : "text-red-400"}`}>
              {pctRounded}%
            </span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ease-out ${pctRounded >= 100 ? "bg-emerald-500" : pctRounded >= 80 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${pct}%`, transitionDuration: "1500ms" }}
            />
          </div>
        </div>
      )}

      {trendPercent !== 0 && (
        <div className={`flex items-center gap-2 text-2xl font-bold ${trendPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trendPercent >= 0
            ? <TrendingUp className="w-6 h-6" />
            : <TrendingDown className="w-6 h-6" />
          }
          <span>{trendPercent >= 0 ? "+" : ""}{trendPercent}% vs. i går</span>
        </div>
      )}
    </div>
  )
}
