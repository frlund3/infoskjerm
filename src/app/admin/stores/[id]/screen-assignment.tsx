"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tv, Copy, Check, Monitor, Wrench } from "lucide-react"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { setScreenAssignment, type Flate, type Orientation } from "@/app/admin/skjermer/actions"

/**
 * Enhets-styring per fysiske skjerm: velg flate (kunde/intern) + avdeling +
 * orientering. /skjerm/<token> rendrer deretter — Pi-en settes opp ÉN gang med
 * denne URL-en og oppdaterer seg selv når du endrer valget her.
 */

export interface ScreenRow {
  id: string
  name: string
  token: string
  flate: Flate
  avdeling: string
  orientation: Orientation
}

export function ScreenAssignment({ screens, origin }: { screens: ScreenRow[]; origin: string }) {
  const config = useTenantConfig()

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Tv className="w-4 h-4 text-zinc-500" />
        <h2 className="font-semibold text-zinc-900">Skjermer (enhets-styring)</h2>
      </div>
      {screens.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Ingen enheter registrert ennå. Når en Raspberry Pi meldes inn får den en <code>/skjerm/&lt;token&gt;</code>-URL,
          og du styrer flate, avdeling og orientering herfra — uten å røre Pi-en.
        </p>
      ) : (
        <div className="space-y-3">
          {screens.map((s) => (
            <ScreenRowEditor
              key={s.id}
              screen={s}
              origin={origin}
              avdelingerKunde={config.avdelinger}
              avdelingerIntern={config.avdelingerIntern}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ScreenRowEditor({
  screen,
  origin,
  avdelingerKunde,
  avdelingerIntern,
}: {
  screen: ScreenRow
  origin: string
  avdelingerKunde: { key: string; label: string }[]
  avdelingerIntern: { key: string; label: string }[]
}) {
  const router = useRouter()
  const [flate, setFlate] = useState<Flate>(screen.flate)
  const [avdeling, setAvdeling] = useState(screen.avdeling)
  const [orientation, setOrientation] = useState<Orientation>(screen.orientation)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = `${origin}/skjerm/${screen.token}`
  const avdelinger = flate === "intern" ? avdelingerIntern : avdelingerKunde

  async function apply(next: { flate: Flate; avdeling: string; orientation: Orientation }) {
    setSaving(true)
    const res = await setScreenAssignment(screen.id, next)
    setSaving(false)
    if (res.ok) { toast.success("Skjerm oppdatert"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke lagre")
  }

  function onFlate(f: Flate) {
    // Bytt flate → nullstill avdeling til «felles» (avdelingene er ulike per flate).
    setFlate(f)
    setAvdeling("felles")
    apply({ flate: f, avdeling: "felles", orientation })
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  const sel = "rounded-lg border border-zinc-200 px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300"

  return (
    <div className="rounded-xl border border-zinc-200 p-3 space-y-3">
      <div className="flex items-center gap-2">
        {flate === "intern" ? <Wrench className="w-3.5 h-3.5 text-zinc-400" /> : <Monitor className="w-3.5 h-3.5 text-zinc-400" />}
        <span className="text-sm font-medium text-zinc-800 flex-1 truncate">{screen.name}</span>
        {saving && <span className="text-[11px] text-zinc-400">lagrer…</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Flate</span>
          <select value={flate} onChange={(e) => onFlate(e.target.value as Flate)} className={`${sel} w-full mt-1`}>
            <option value="kunde">Kundeskjerm</option>
            <option value="intern">Internskjerm</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Avdeling</span>
          <select value={avdeling} onChange={(e) => { setAvdeling(e.target.value); apply({ flate, avdeling: e.target.value, orientation }) }} className={`${sel} w-full mt-1`}>
            {avdelinger.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Orientering</span>
          <select value={orientation} onChange={(e) => { setOrientation(e.target.value as Orientation); apply({ flate, avdeling, orientation: e.target.value as Orientation }) }} className={`${sel} w-full mt-1`}>
            <option value="portrait">Stående</option>
            <option value="landscape">Liggende</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
        <span className="text-xs text-zinc-400 flex-shrink-0">Pi-URL</span>
        <span className="text-xs font-mono text-zinc-600 truncate flex-1">{url}</span>
        <button onClick={copy} title="Kopier" className="p-1 rounded text-zinc-400 hover:text-zinc-700">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}
