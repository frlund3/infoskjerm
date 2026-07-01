"use client"

import { useEffect, useState } from "react"
import { KioskStage } from "./kiosk-stage"

interface Variant {
  src: string
  width: number
  height: number
}

/**
 * Velger automatisk portrett- eller landskap-mal etter enhetens FAKTISKE
 * orientering (vindusforhold), og bytter live ved rotasjon. Så samme kiosk-URL
 * fyller alltid skjermen — stående telefon får portrett-malen, liggende skjerm
 * får landskap-malen. Eksplisitt ?orientation i URL-en overstyrer (håndteres i
 * page.tsx, som da rendrer KioskStage direkte).
 */
export function KioskAuto({
  portrait,
  landscape,
  title,
}: {
  portrait: Variant
  landscape: Variant
  title: string
}) {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth >= window.innerHeight)
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [])

  // Unngå å laste feil mal først: hold svart til orienteringen er kjent.
  if (isLandscape === null) {
    return <div style={{ position: "fixed", inset: 0, background: "#0a0a0c" }} />
  }

  const v = isLandscape ? landscape : portrait
  return <KioskStage src={v.src} title={title} width={v.width} height={v.height} />
}
