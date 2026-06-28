"use client"

import { useEffect } from "react"

interface ChainThemeProviderProps {
  chainKey: string
  brandPrimary?: string
  brandLight?: string
  brandFg?: string
  children: React.ReactNode
}

export function ChainThemeProvider({ chainKey, brandPrimary, brandLight, brandFg, children }: ChainThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-chain", chainKey)
    if (brandPrimary) document.documentElement.style.setProperty("--brand-primary", brandPrimary)
    if (brandLight) document.documentElement.style.setProperty("--brand-light", brandLight)
    if (brandFg) document.documentElement.style.setProperty("--brand-fg", brandFg)
    return () => {
      document.documentElement.removeAttribute("data-chain")
      document.documentElement.style.removeProperty("--brand-primary")
      document.documentElement.style.removeProperty("--brand-light")
      document.documentElement.style.removeProperty("--brand-fg")
    }
  }, [chainKey, brandPrimary, brandLight, brandFg])

  return <>{children}</>
}
