"use client"

import { useState } from "react"
import { Monitor, Wrench, Copy, Check, Lock, Loader2, ExternalLink } from "lucide-react"
import { setKioskPassword } from "../actions"

/**
 * Kiosk-innstillinger for én enhet: delbare «telefon/nettbrett som skjerm»-lenker
 * (kunde + intern) og valgfritt passord for privat visning. Kunden setter det selv.
 */
export function KioskSettings({
  storeId,
  storeName,
  hasPassword,
}: {
  storeId: string
  storeName: string
  hasPassword: boolean
}) {
  const slug = encodeURIComponent(storeName)
  const customerUrl = `/vis/${slug}`
  const internalUrl = `/vis/${slug}?type=intern`

  const [protectedNow, setProtectedNow] = useState(hasPassword)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(next: string) {
    setSaving(true)
    setMsg(null)
    const res = await setKioskPassword(storeId, next)
    setSaving(false)
    if (!res.ok) { setMsg(res.error ?? "Kunne ikke lagre"); return }
    setProtectedNow(!!next.trim())
    setPassword("")
    setMsg(next.trim() ? "Passord lagret." : "Passord fjernet – visningen er åpen.")
  }

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-900">Skjerm-visning (kiosk)</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Åpne lenken på en telefon, nettbrett eller PC og sett i fullskjerm — samme visning som en fysisk skjerm.</p>
      </div>

      <KioskLink icon={<Monitor className="w-4 h-4 text-zinc-400" />} label="Kundeskjerm" url={customerUrl} />
      <KioskLink icon={<Wrench className="w-4 h-4 text-zinc-400" />} label="Intern skjerm (verksted/pauserom)" url={internalUrl} />

      <div className="pt-3 border-t border-zinc-100 space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-800">Privat visning</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${protectedNow ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
            {protectedNow ? "Passordbeskyttet" : "Åpen"}
          </span>
        </div>
        <p className="text-xs text-zinc-500">Sett et passord så visningen ikke kan åpnes av uvedkommende. La feltet stå tomt og lagre for å fjerne passordet.</p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={protectedNow ? "Nytt passord" : "Velg passord"}
            autoComplete="new-password"
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <button
            onClick={() => save(password)}
            disabled={saving || (!password.trim() && !protectedNow)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Lagre
          </button>
          {protectedNow && (
            <button
              onClick={() => save("")}
              disabled={saving}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:border-zinc-300 disabled:opacity-50"
            >
              Fjern
            </button>
          )}
        </div>
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      </div>
    </div>
  )
}

function KioskLink({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const full = typeof window !== "undefined" ? `${window.location.origin}${url}` : url

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard utilgjengelig – ignorer */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-700">{label}</p>
        <p className="text-xs text-zinc-400 truncate font-mono">{url}</p>
      </div>
      <button onClick={copy} title="Kopier lenke" className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Åpne" className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}
