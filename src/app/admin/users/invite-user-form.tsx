"use client"

import { useState } from "react"
import { UserPlus, X, Loader2 } from "lucide-react"
import { inviteUser } from "./actions"

import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles"

type InviteRole = "chain_manager" | "area_manager" | "store_manager" | "store_employee"

const ROLE_OPTIONS: { value: InviteRole; label: string; desc: string }[] = [
  { value: "chain_manager", label: ROLE_LABELS.chain_manager, desc: ROLE_DESCRIPTIONS.chain_manager },
  { value: "area_manager", label: ROLE_LABELS.area_manager, desc: ROLE_DESCRIPTIONS.area_manager },
  { value: "store_manager", label: ROLE_LABELS.store_manager, desc: ROLE_DESCRIPTIONS.store_manager },
  { value: "store_employee", label: ROLE_LABELS.store_employee, desc: ROLE_DESCRIPTIONS.store_employee },
]

export function InviteUserForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteRole>("store_employee")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const result = await inviteUser(email.trim(), role)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke sende invitasjon")
    } else {
      setSuccess(true)
      setEmail("")
      setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Inviter bruker
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-900">Inviter ny bruker</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Invitasjon sendt!</p>
            <p className="text-xs text-zinc-500 mt-1">Brukeren får en e-post med lenke for å sette passord.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">E-postadresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bruker@eksempel.no"
                required
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-2">Rolle</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      role === opt.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                      <p className="text-xs text-zinc-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Sender..." : "Send invitasjon"}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
