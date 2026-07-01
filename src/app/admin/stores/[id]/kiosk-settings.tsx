"use client"

import { useState } from "react"
import { Copy, Check, Lock, Loader2, ExternalLink } from "lucide-react"
import { setKioskPassword } from "../actions"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { withFelles } from "@/lib/tenant/config"

/**
 * Kiosk-innstillinger for én enhet: bygg en delbar «telefon/nettbrett som skjerm»-
 * lenke med FLATE (kunde/intern) + AVDELING + ORIENTERING — samme valg som en
 * fysisk skjerm — pluss valgfritt passord for privat visning.
 */

type Flate = "kunde" | "intern"
type Orient = "auto" | "staaende" | "liggende"

export function KioskSettings({
  storeId,
  storeName,
  hasPassword,
}: {
  storeId: string
  storeName: string
  hasPassword: boolean
}) {
  const { avdelinger, avdelingerIntern, unitLabel } = useTenantConfig()
  const slug = encodeURIComponent(storeName)

  const [flate, setFlate] = useState<Flate>("kunde")
  const [avdeling, setAvdeling] = useState("felles")
  const [orient, setOrient] = useState<Orient>("auto")

  const [protectedNow, setProtectedNow] = useState(hasPassword)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const avdList = withFelles(flate === "intern" ? avdelingerIntern : avdelinger, unitLabel)

  // Bygg /vis-URL fra valgene. Avdeling «felles» og orientering «auto» er
  // standard og utelates for pene lenker. Intern er alltid liggende (bakrom).
  const params = new URLSearchParams()
  if (flate === "intern") params.set("type", "intern")
  if (avdeling && avdeling !== "felles") params.set("avdeling", avdeling)
  if (flate === "kunde" && orient !== "auto") params.set("orientation", orient)
  const qs = params.toString()
  const url = `/vis/${slug}${qs ? `?${qs}` : ""}`

  function selectFlate(next: Flate) {
    setFlate(next)
    setAvdeling("felles") // avdelinger er ulike for kunde vs intern
  }

  async function save(next: string) {
    setSaving(true)
    setMsg(null)
    const res = await setKioskPassword(storeId, next)
    setSaving(false)
    if (!res.ok) {
      setMsg(res.error ?? "Kunne ikke lagre")
      return
    }
    setProtectedNow(!!next.trim())
    setPassword("")
    setMsg(next.trim() ? "Passord lagret." : "Passord fjernet – visningen er åpen.")
  }

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-900">Skjerm-visning (kiosk)</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Velg flate, avdeling og orientering — så får du en delbar lenke du åpner på en telefon, nettbrett eller PC i fullskjerm.
        </p>
      </div>

      {/* URL-bygger: flate + avdeling + orientering */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Field label="Flate">
          <Select value={flate} onChange={(v) => selectFlate(v as Flate)}>
            <option value="kunde">Kundeskjerm</option>
            <option value="intern">Intern skjerm</option>
          </Select>
        </Field>
        <Field label="Avdeling">
          <Select value={avdeling} onChange={setAvdeling}>
            {avdList.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Orientering">
          {flate === "kunde" ? (
            <Select value={orient} onChange={(v) => setOrient(v as Orient)}>
              <option value="auto">Auto (etter enhet)</option>
              <option value="staaende">Stående</option>
              <option value="liggende">Liggende</option>
            </Select>
          ) : (
            <div className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-400 bg-zinc-50/60">Liggende</div>
          )}
        </Field>
      </div>

      <KioskLink url={url} />

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
    >
      {children}
    </select>
  )
}

function KioskLink({ url }: { url: string }) {
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
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Lenke</p>
        <p className="text-xs text-zinc-600 truncate font-mono">{url}</p>
      </div>
      <button onClick={copy} title="Kopier lenke" className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 flex-shrink-0">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" title="Åpne" className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 flex-shrink-0">
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}
