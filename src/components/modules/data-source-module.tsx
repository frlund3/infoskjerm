"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface DataPayload {
  value: number | string
  label?: string
  unit?: string
  trend?: number
}

interface DataSourceModuleProps {
  fields: Record<string, unknown>
}

export function DataSourceModule({ fields }: DataSourceModuleProps) {
  const sourceUrl = fields.source_url as string | null
  const refreshSeconds = Number(fields.refresh_interval ?? 30)
  const displayLabel = fields.label as string | null
  const unit = fields.unit as string | null

  const [data, setData] = useState<DataPayload | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!sourceUrl) return

    const proxyUrl = `/api/data-source?url=${encodeURIComponent(sourceUrl)}`

    async function fetchData() {
      try {
        const res = await fetch(proxyUrl, { cache: "no-store" })
        if (!res.ok) throw new Error("fetch failed")
        const json = await res.json()
        setData(json)
        setError(false)
      } catch {
        setError(true)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, refreshSeconds * 1000)
    return () => clearInterval(timer)
  }, [sourceUrl, refreshSeconds])

  if (!sourceUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
        <div className="text-5xl">🔗</div>
        <p className="text-xl font-semibold">Datakilde</p>
        <p className="text-gray-400 text-sm text-center">Angi en kilde-URL i builder-feltet.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-red-400 gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-sm">Klarte ikke hente data fra kilden</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const trend = data.trend
  const TrendIcon = trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor = trend === undefined || trend === 0 ? "text-gray-400" : trend > 0 ? "text-green-400" : "text-red-400"

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white gap-4 p-8">
      <p className="text-lg text-gray-400 uppercase tracking-widest">
        {data.label ?? displayLabel ?? "Verdi"}
      </p>
      <div className="flex items-end gap-2">
        <span className="text-8xl font-bold tabular-nums">{data.value}</span>
        {(data.unit ?? unit) && (
          <span className="text-3xl text-gray-400 mb-3">{data.unit ?? unit}</span>
        )}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-lg ${trendColor}`}>
          <TrendIcon className="w-5 h-5" />
          <span>{trend > 0 ? "+" : ""}{trend}%</span>
        </div>
      )}
    </div>
  )
}
