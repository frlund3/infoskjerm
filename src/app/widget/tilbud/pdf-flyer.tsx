"use client"

import { useEffect, useState } from "react"

/**
 * Shows the kundeavis flyer as rotating page images under a bold chain-coloured
 * heading. Prefers server pre-rendered page images (`pages`) — instant, no work
 * on the weak Pi. Falls back to client-side pdf.js rasterisation (via the CORS
 * proxy) when pre-rendered pages aren't available yet.
 */

const GREEN = "#16a34a"
const MAX_PAGES = 6
const PAGE_SECONDS = 7

export function PdfFlyer({ url, title, color, fg, pages: serverPages }: { url: string; title?: string; color?: string | null; fg?: string | null; pages?: string[] }) {
  const headBg = color || GREEN
  const headFg = fg || "#fff"
  const preRendered = serverPages && serverPages.length > 0 ? serverPages : null
  const [pages, setPages] = useState<string[]>(preRendered ?? [])
  const [i, setI] = useState(0)

  useEffect(() => {
    if (preRendered) { setPages(preRendered); return } // already have server images
    let cancelled = false
    ;(async () => {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
      // Flyer CDNs don't send CORS headers — fetch through our same-origin proxy.
      const src = `/api/kundeavis-pdf?url=${encodeURIComponent(url)}`
      const doc = await pdfjs.getDocument({ url: src }).promise
      const n = Math.min(MAX_PAGES, doc.numPages)
      const out: string[] = []
      for (let p = 1; p <= n && !cancelled; p++) {
        const page = await doc.getPage(p)
        const viewport = page.getViewport({ scale: 1.7 })
        const canvas = document.createElement("canvas")
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const ctx = canvas.getContext("2d")
        if (!ctx) continue
        await page.render({ canvasContext: ctx, viewport }).promise
        out.push(canvas.toDataURL("image/jpeg", 0.82))
        if (!cancelled) setPages([...out])
      }
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url, preRendered])

  useEffect(() => {
    if (pages.length <= 1) return
    const id = setTimeout(() => setI((v) => (v + 1) % pages.length), PAGE_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [i, pages])

  const page = pages.length ? pages[i % pages.length] : null

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {title && (
        <div style={{ flex: "0 0 auto", background: headBg, color: headFg, textAlign: "center", padding: "3vmin 4vmin", fontWeight: 900, fontSize: "6vmin", letterSpacing: "0.3vmin", textTransform: "uppercase", lineHeight: 1 }}>
          {title}
        </div>
      )}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative", padding: "2.5vmin" }}>
        {page ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={page} alt="" style={{ position: "absolute", inset: "2.5vmin", width: "calc(100% - 5vmin)", height: "calc(100% - 5vmin)", objectFit: "contain", animation: "grFade .5s ease-out" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0a6", fontSize: "4vmin" }}>Laster kundeavis…</div>
        )}
      </div>
      {pages.length > 1 && (
        <div style={{ flex: "0 0 auto", display: "flex", gap: "1.6vmin", justifyContent: "center", padding: "0 0 2.5vmin" }}>
          {pages.map((_, p) => (
            <span key={p} style={{ width: "2vmin", height: "2vmin", borderRadius: "50%", background: p === i % pages.length ? headBg : "#d1d5db" }} />
          ))}
        </div>
      )}
    </div>
  )
}
