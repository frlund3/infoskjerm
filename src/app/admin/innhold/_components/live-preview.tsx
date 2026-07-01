"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Live preview thumbnail: encodes the current (unsaved) form fields and points a
 * scaled iframe at /widget/preview, which renders them with the real on-screen
 * components. Debounced so typing doesn't thrash the iframe. Portrait for
 * customer content, landscape for internal.
 */
export function LivePreview({ data, portrait }: { data: unknown; portrait: boolean }) {
  const [src, setSrc] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  const STAGE_W = portrait ? 1080 : 1920
  const STAGE_H = portrait ? 1920 : 1080

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const json = JSON.stringify(data)
        const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        setSrc(`/widget/preview?d=${b64}&o=${portrait ? "portrait" : "landscape"}`)
      } catch { /* ignore */ }
    }, 450)
    return () => clearTimeout(id)
  }, [data, portrait])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [STAGE_W])

  return (
    <div ref={wrapRef} className="relative mx-auto overflow-hidden rounded-xl border border-zinc-200 bg-black shadow-sm" style={{ aspectRatio: portrait ? "9 / 16" : "16 / 9", width: "100%", maxWidth: portrait ? 260 : undefined }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {src && <iframe title="Forhåndsvisning" src={src} scrolling="no" style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STAGE_H, border: "none" }} />}
      </div>
    </div>
  )
}
