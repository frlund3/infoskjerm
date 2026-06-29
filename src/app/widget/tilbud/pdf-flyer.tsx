"use client"

import { useEffect, useState } from "react"

/**
 * Renders the FRONT PAGE of a PDF flyer (kundeavis) to an image in the browser
 * with pdf.js, full-bleed, with a heading above it (e.g. "Kundeavis uke 27").
 * No PDF toolbar, no multi-page rotation — just the cover.
 */

const GREEN = "#16a34a"

export function PdfFlyer({ url, title }: { url: string; title?: string }) {
  const [cover, setCover] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
      const doc = await pdfjs.getDocument({ url }).promise
      const page = await doc.getPage(1)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement("canvas")
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      await page.render({ canvasContext: ctx, viewport }).promise
      if (!cancelled) setCover(canvas.toDataURL("image/jpeg", 0.85))
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
      {title && (
        <div style={{ flex: "0 0 auto", background: GREEN, color: "#fff", textAlign: "center", padding: "2.4vmin", fontWeight: 900, fontSize: "5vmin", letterSpacing: "0.3vmin", textTransform: "uppercase" }}>
          {title}
        </div>
      )}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", animation: "grFade .5s ease-out" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0a6", fontSize: "4vmin" }}>Laster kundeavis…</div>
        )}
      </div>
    </div>
  )
}
