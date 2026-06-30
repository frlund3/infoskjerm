"use client"

import { useState } from "react"
import { signupForEvent } from "./actions"
import { Loader2, PartyPopper, Minus, Plus } from "lucide-react"

export function SignupForm({
  contentItemId,
  storeId,
  accent,
  deadlineText,
}: {
  contentItemId: string
  storeId: string | null
  accent: string
  deadlineText: string | null
}) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [guests, setGuests] = useState(0)
  const [dietary, setDietary] = useState("")
  const [comment, setComment] = useState("")
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signupForEvent(contentItemId, storeId, { name, department, guests, dietary, comment, email, consent })
    setLoading(false)
    if (res.ok) setDone(true)
    else setError(res.error)
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
        <PartyPopper className="mx-auto mb-3 h-14 w-14" style={{ color: accent }} />
        <h2 className="text-2xl font-extrabold text-zinc-900">Du er påmeldt! 🎉</h2>
        <p className="mt-2 text-zinc-500">
          Vi har registrert påmeldingen din{guests > 0 ? ` med ${guests} i følge` : ""}. Gleder oss til å se deg!
        </p>
      </div>
    )
  }

  const field = "w-full rounded-xl border border-zinc-200 px-4 py-3 text-base focus:outline-none focus:ring-2"
  const ring = { ["--tw-ring-color" as string]: accent }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-extrabold text-zinc-900">Meld deg på</h2>
      {deadlineText && <p className="-mt-1 text-sm text-zinc-500">Påmeldingsfrist {deadlineText}</p>}

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" autoComplete="name" className={field} style={ring} />
      <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Avdeling (valgfri)" className={field} style={ring} />

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-2.5">
        <span className="text-base text-zinc-700">Antall i følge</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setGuests((g) => Math.max(0, g - 1))} aria-label="Færre"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-lg font-bold tabular-nums">{guests}</span>
          <button type="button" onClick={() => setGuests((g) => Math.min(20, g + 1))} aria-label="Flere"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: accent }}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="Allergier / matpreferanser (valgfri)" className={field} style={ring} />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kommentar (valgfri)" rows={2} className={field} style={ring} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post for bekreftelse (valgfri)" inputMode="email" autoComplete="email" className={field} style={ring} />

      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 rounded border-zinc-300" />
        <span>Jeg samtykker til at påmeldingsopplysningene lagres for å administrere arrangementet.</span>
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button type="submit" disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: accent }}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send påmelding 🎉"}
      </button>
    </form>
  )
}
