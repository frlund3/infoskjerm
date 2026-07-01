"use client"

import { useState } from "react"
import { Smartphone, Copy, Check, ExternalLink, Lock, Loader2, X } from "lucide-react"
import { setKioskPassword } from "@/app/admin/stores/actions"

/**
 * Kompakt kiosk-blokk per butikk i Skjermer-oversikten: delbare «mobil som
 * skjerm»-lenker (kunde + intern) + passord for privat visning — så alt kan ses
 * og settes uten å gå inn på hver enkelt butikk. Speiler KioskSettings på
 * butikk-detalj (setKioskPassword), men slankere for kort-grid.
 */
export function StoreKioskInline({
  storeId,
  storeName,
  hasPassword,
}: {
  storeId: string
  storeName: string
  hasPassword: boolean
}) {
  const slug = encodeURIComponent(storeName)
  const [protectedNow, setProtectedNow] = useState(hasPassword)
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(next: string) {
    setSaving(true)
    setError(null)
    const res = await setKioskPassword(storeId, next)
    setSaving(false)
    if (!res.ok) {
      setError(res.error ?? "Kunne ikke lagre")
      return
    }
    setProtectedNow(!!next.trim())
    setPassword("")
    setEditing(false)
  }

  return (
    <div className="border-t border-zinc-50 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Smartphone className="w-3 h-3 text-zinc-400 flex-shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Mobil visning</span>
        {protectedNow && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700" title="Passordbeskyttet">
            <Lock className="w-2.5 h-2.5" /> Beskyttet
          </span>
        )}
        <button
          onClick={() => { setEditing((e) => !e); setError(null) }}
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
        >
          <Lock className="w-2.5 h-2.5" />
          {editing ? "Lukk" : protectedNow ? "Endre passord" : "Sett passord"}
        </button>
      </div>

      <KioskLink label="Kunde" url={`/vis/${slug}`} />
      <KioskLink label="Intern" url={`/vis/${slug}?type=intern`} />

      {editing && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={protectedNow ? "Nytt passord" : "Velg passord"}
              autoComplete="new-password"
              className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
            <button
              onClick={() => save(password)}
              disabled={saving || (!password.trim() && !protectedNow)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              Lagre
            </button>
            {protectedNow && (
              <button
                onClick={() => save("")}
                disabled={saving}
                className="inline-flex items-center text-xs font-medium px-2 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-zinc-300 disabled:opacity-50"
                title="Fjern passord (åpen visning)"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-zinc-400">Tomt + Lagre fjerner passordet (åpen visning).</p>
          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}

function KioskLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const full = typeof window !== "undefined" ? `${window.location.origin}${url}` : url

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard utilgjengelig – ignorer */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50/70 px-2.5 py-1.5">
      <span className="text-[11px] font-medium text-zinc-600 w-10 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-zinc-400 truncate font-mono flex-1 min-w-0">{url}</span>
      <button onClick={copy} title="Kopier lenke" className="p-1 rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 flex-shrink-0">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Åpne" className="p-1 rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 flex-shrink-0">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}
