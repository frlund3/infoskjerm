"use client"

import { useEffect, useState } from "react"
import { Fingerprint, ShieldCheck, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import {
  isBiometricEnabled,
  isBiometricSupported,
  registerBiometric,
  disableBiometric,
} from "@/lib/biometric/client"

type State = "loading" | "unsupported" | "off" | "on"

export function BiometricCard({ label }: { label: string }) {
  const [state, setState] = useState<State>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    isBiometricSupported().then((supported) => {
      if (!active) return
      if (!supported) setState("unsupported")
      else setState(isBiometricEnabled() ? "on" : "off")
    })
    return () => {
      active = false
    }
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await registerBiometric(label)
      if (ok) {
        setState("on")
        toast.success("Biometrisk lås er på for denne enheten.")
      } else {
        toast.error("Kunne ikke aktivere biometrisk lås.")
      }
    } finally {
      setBusy(false)
    }
  }

  const disable = () => {
    disableBiometric()
    setState("off")
    toast.success("Biometrisk lås er av.")
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${state === "on" ? "bg-emerald-100" : "bg-zinc-100"}`}>
            {state === "on" ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <Fingerprint className="w-5 h-5 text-zinc-500" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">Biometrisk lås</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {state === "loading" && "Sjekker støtte …"}
              {state === "unsupported" && "Denne enheten støtter ikke Face ID / Touch ID i nettleseren. Installer appen på hjemskjermen først."}
              {state === "off" && "Krev Face ID / Touch ID når appen åpnes. Sesjonen din forblir innlogget bak låsen."}
              {state === "on" && "Appen krever Face ID / Touch ID ved åpning på denne enheten."}
            </p>
          </div>
        </div>

        {(state === "off" || state === "on") && (
          <div className="mt-4">
            {state === "off" ? (
              <button onClick={enable} disabled={busy} className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl py-2.5 px-4 disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />} Aktiver biometrisk lås
              </button>
            ) : (
              <button onClick={disable} className="flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 rounded-xl py-2.5 px-4 border border-zinc-200">
                <Check className="w-4 h-4" /> Skru av på denne enheten
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
