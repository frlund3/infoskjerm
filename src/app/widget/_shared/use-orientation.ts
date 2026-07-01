"use client"

import { useEffect, useState } from "react"

export type Orientation = "portrait" | "landscape"

/**
 * Widget-orientering fra iframe-/vindusforholdet. /vis rendrer hver widget i en
 * iframe med riktig forhold (stående 1080×1920 / liggende 1920×1080), så
 * window.innerWidth vs innerHeight gir widgetens faktiske orientering. Brukes av
 * skjerm-widgetene til å velge stående (vertikal stabling) vs liggende
 * (horisontal split) layout — 10/10 begge veier.
 */
export function useOrientation(): Orientation {
  // Deterministisk start (liggende) for SSR/hydrering; klienten korrigerer straks.
  const [orientation, setOrientation] = useState<Orientation>("landscape")

  useEffect(() => {
    const check = () => setOrientation(window.innerWidth >= window.innerHeight ? "landscape" : "portrait")
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [])

  return orientation
}
