"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Viser skjerm-widgeten så den ALLTID fyller enheten (contain, aldri klippet),
 * men uten å bli uskarp:
 *  • Stor nok skjerm (design ≤ skjerm) → render iframe i NATIV skjermoppløsning
 *    (ingen oppskalering) → knivskarpt, også PDF-rasterisering på store skjermer.
 *  • Liten skjerm (telefon) → render i design-oppløsning og skalér NED (contain)
 *    → skarpt (nedskalering), hele designet vises.
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
  const [box, setBox] = useState<{ cw: number; ch: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setBox({ cw: el.clientWidth, ch: el.clientHeight })
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
  }, [])

  let inner: React.ReactNode = null
  if (box) {
    const scale = Math.min(box.cw / width, box.ch / height)
    if (scale >= 1) {
      // Skjermen er minst like stor som designet → render i native oppløsning
      // (contain-boks i skjermens faktiske piksler). Ingen transform = ingen
      // oppskalering = skarpt.
      const designAspect = width / height
      const containerAspect = box.cw / box.ch
      const displayW = Math.round(containerAspect > designAspect ? box.ch * designAspect : box.cw)
      const displayH = Math.round(containerAspect > designAspect ? box.ch : box.cw / designAspect)
      inner = (
        <iframe
          src={src}
          title={title}
          style={{ width: displayW, height: displayH, border: 0, display: "block" }}
          allow="fullscreen"
        />
      )
    } else {
      // Mindre skjerm (telefon/nettbrett) → render i design-oppløsning, skalér ned.
      inner = (
        <div style={{ width, height, flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "center center" }}>
          <iframe src={src} title={title} style={{ width, height, border: 0, display: "block" }} allow="fullscreen" />
        </div>
      )
    }
  }

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
        visibility: box ? "visible" : "hidden",
      }}
    >
      {inner}
    </div>
  )
}
