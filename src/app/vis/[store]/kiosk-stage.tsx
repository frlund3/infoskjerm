"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Rendrer skjerm-widgeten i sin NATIVE oppløsning (1080×1920 stående /
 * 1920×1080 liggende) og skalerer den ned for å passe enheten (contain) —
 * så hele designet alltid vises, aldri klippet, uansett telefon/nettbrett/
 * skjerm-forhold. Samme teknikk som CMS-forhåndsvisningen. Svarte kanter når
 * enhetens forhold ikke matcher malen.
 */
export function KioskStage({
  src,
  title,
  width,
  height,
}: {
  src: string
  title: string
  width: number
  height: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(Math.min(el.clientWidth / width, el.clientHeight / height))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // orientering-endring på telefon/nettbrett gir ikke alltid ResizeObserver → dekk begge.
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [width, height])

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a0a",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width,
          height,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          // Skjul til skalering er beregnet (unngår ett-frames overflow-glimt).
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <iframe
          src={src}
          title={title}
          style={{ width, height, border: 0, display: "block" }}
          allow="fullscreen"
        />
      </div>
    </div>
  )
}
