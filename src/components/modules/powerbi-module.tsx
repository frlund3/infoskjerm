"use client"

import { useEffect, useRef } from "react"

interface PowerBIModuleProps {
  fields: Record<string, unknown>
}

export function PowerBIModule({ fields }: PowerBIModuleProps) {
  const embedUrl = fields.embed_url as string | null
  const refreshInterval = Number(fields.refresh_interval ?? 300)
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
        <div className="text-5xl">📊</div>
        <p className="text-xl font-semibold">Power BI</p>
        <p className="text-gray-400 text-sm text-center">
          Lim inn en Power BI «Publish to web»-URL i builder-feltet.
        </p>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allowFullScreen
      title="Power BI rapport"
    />
  )
}
