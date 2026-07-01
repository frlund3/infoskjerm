"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Loader2 } from "lucide-react"
import { unlockKiosk } from "./actions"

/**
 * Passord-port for privat kiosk-visning. Vises når enheten har satt et
 * kiosk-passord og besøkeren ennå ikke er låst opp. Ved riktig passord settes
 * en httpOnly-cookie og siden re-rendres til selve skjermen.
 */
export function KioskGate({ storeId, storeName }: { storeId: string; storeName: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim() || loading) return
    setLoading(true)
    setError(null)
    const res = await unlockKiosk(storeId, password)
    if (res.ok) {
      router.refresh()
      return
    }
    setLoading(false)
    setError(res.error ?? "Kunne ikke låse opp.")
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0a0a0a,#161616)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ width: "100%", maxWidth: 360, textAlign: "center", display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(255,255,255,.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{storeName}</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", margin: "6px 0 0" }}>Skriv passord for å vise skjermen</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passord"
          autoFocus
          autoComplete="current-password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.15)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontSize: 16,
            outline: "none",
          }}
        />
        {error && <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password.trim()}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            border: "none",
            background: "#fff",
            color: "#0a0a0a",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: loading || !password.trim() ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Vis skjerm
        </button>
      </form>
    </div>
  )
}
