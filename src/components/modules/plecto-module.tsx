"use client"

import { useEffect, useRef } from "react"

interface PlectoModuleProps {
  fields: Record<string, unknown>
}

export function PlectoModule({ fields }: PlectoModuleProps) {
  const embedUrl = fields.embed_url as string | null
  const refreshInterval = Number(fields.refresh_interval ?? 60)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!embedUrl || refreshInterval <= 0) return
    const timer = setInterval(() => {
      if (iframeRef.current) {
        iframeRef.current.src = embedUrl
      }
    }, refreshInterval * 1000)
    return () => clearInterval(timer)
  }, [embedUrl, refreshInterval])

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a2e] text-white gap-4">
        <div className="text-5xl">🏆</div>
        <p className="text-xl font-semibold">Plecto</p>
        <p className="text-gray-400 text-sm text-center">
          Lim inn Plecto dashboard-URL i builder-feltet.
        </p>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allowFullScreen
      title="Plecto dashboard"
    />
  )
}
