"use client"

import { useEffect, useState } from "react"
import { Fingerprint, Lock, LogOut, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { isBiometricEnabled, verifyBiometric } from "@/lib/biometric/client"
import { createClient } from "@/lib/supabase/client"

/**
 * Lås-overlay: dekker appen ved kald åpning når biometrisk lås er på, til
 * brukeren bekrefter med Face ID/Touch ID. Opplåst tilstand huskes per
 * app-økt (sessionStorage), så det spørres ikke ved hver navigering.
 *
 * Auto-trigger unngås med vilje — iOS krever en brukergest for WebAuthn get().
 */

const SESSION_KEY = "biometric-unlocked"

export function BiometricLock() {
  const [locked, setLocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isBiometricEnabled()) return
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return
    } catch {
      return
    }
    setLocked(true)
  }, [])

  const unlock = async () => {
    setChecking(true)
    setFailed(false)
    const ok = await verifyBiometric()
    setChecking(false)
    if (ok) {
      try { sessionStorage.setItem(SESSION_KEY, "1") } catch {}
      setLocked(false)
    } else {
      setFailed(true)
    }
  }

  const logout = async () => {
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 text-center">
      <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-5" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
        <Lock className="w-7 h-7" />
      </span>
      <h1 className="text-lg font-bold text-zinc-900">Infoskjerm er låst</h1>
      <p className="text-sm text-zinc-500 mt-1 max-w-xs">
        Bekreft med Face ID eller Touch ID for å fortsette.
      </p>

      <button
        onClick={unlock}
        disabled={checking}
        className="mt-6 w-full max-w-xs flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-xl py-3 disabled:opacity-60"
        style={{ backgroundColor: "var(--brand-primary, #18181b)" }}
      >
        {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
        Lås opp
      </button>

      {failed && (
        <p className="text-xs text-red-600 mt-3">Kunne ikke bekrefte. Prøv igjen eller logg inn med passord.</p>
      )}

      <button onClick={logout} className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800">
        <LogOut className="w-3.5 h-3.5" /> Logg inn med passord i stedet
      </button>
    </div>
  )
}
