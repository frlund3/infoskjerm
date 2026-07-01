"use client"

import { useEffect, useState } from "react"

/**
 * Rendrer skjerm-widgeten i sin FASTE design-oppløsning (portrett 1080×1920,
 * liggende 1920×1080) og skalerer hele boksen uniformt til vinduet. Slik ser
 * innholdet identisk ut uansett hvor URL-en åpnes: på Pi-en (montert i riktig
 * orientering) er skala ≈ 1 og fyller skjermen; i en vanlig nettleser skaleres
 * hele designet ned og «brev-bokses», så du ser eksakt slik skjermen viser —
 * aldri strukket, aldri sprengt tekst.
 */
export function ScaledScreen({ src, landscape }: { src: string; landscape: boolean }) {
  const REF_W = landscape ? 1920 : 1080
  const REF_H = landscape ? 1080 : 1920
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H))
    update()
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [REF_W, REF_H])

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <iframe
        src={src}
        title="Skjerm"
        allow="fullscreen"
        style={{
          width: REF_W,
          height: REF_H,
          border: 0,
          display: "block",
          flex: "0 0 auto",
          transform: `scale(${scale ?? 0})`,
          transformOrigin: "center center",
          // Skjul til første måling så vi aldri blinker full-størrelse.
          visibility: scale === null ? "hidden" : "visible",
        }}
      />
    </div>
  )
}
