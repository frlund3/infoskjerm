"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutGrid, Plus, Trash2, Lock, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { saveAvdelinger } from "./actions"
import type { Avdeling } from "@/lib/tenant/config"

/**
 * Kunden lager sine egne avdelinger — SEPARAT for kunde- og internskjermer.
 * «Hele enheten» (felles) er alltid til stede og henter navn fra terminologi;
 * den kan ikke redigeres/slettes. Avdelinger brukes til å målrette innhold og
 * til å velge hva en fysisk skjerm (Pi) viser (flate + avdeling) — uten å røre Pi-en.
 */

type Flate = "kunde" | "intern"

/** Fjerner felles-oppføringen (den er implisitt/derivert). */
function editable(list: Avdeling[]): Avdeling[] {
  return list.filter((a) => a.key !== "felles")
}

export function AvdelingerCard() {
  const router = useRouter()
  const config = useTenantConfig()
  const felles = config.avdelinger.find((a) => a.key === "felles")?.label ?? "Hele enheten"

  const [flate, setFlate] = useState<Flate>("kunde")
  const [kunde, setKunde] = useState<Avdeling[]>(editable(config.avdelinger))
  const [intern, setIntern] = useState<Avdeling[]>(editable(config.avdelingerIntern))
  const [saving, setSaving] = useState(false)

  const list = flate === "kunde" ? kunde : intern
  const setList = flate === "kunde" ? setKunde : setIntern

  const setLabel = (i: number, label: string) => setList((p) => p.map((a, idx) => (idx === i ? { ...a, label } : a)))
  const add = () => setList((p) => [...p, { key: "", label: "" }])
  const remove = (i: number) => setList((p) => p.filter((_, idx) => idx !== i))

  async function save() {
    setSaving(true)
    const res = await saveAvdelinger(flate, list.map((a) => ({ key: a.key || undefined, label: a.label })))
    setSaving(false)
    if (res.ok) { toast.success("Avdelinger lagret"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke lagre")
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-zinc-500" />
          Avdelinger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500">
          Del opp skjermene i avdelinger — f.eks. ulike deler av lokalet. En skjerm kan settes til
          en avdeling eller «{felles}». Kunde- og internskjermer har hver sine avdelinger.
        </p>

        {/* Fane: kunde / intern */}
        <div className="flex gap-1.5">
          {(["kunde", "intern"] as Flate[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFlate(f)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                flate === f ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {f === "kunde" ? "Kundeskjerm" : "Internskjerm"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {/* Låst «Hele enheten» */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2">
            <Lock className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 flex-1">{felles}</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">alltid</span>
          </div>

          {list.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={a.label}
                onChange={(e) => setLabel(i, e.target.value)}
                placeholder="Ny avdeling…"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
              <button type="button" onClick={() => remove(i)} title="Fjern" className="p-2 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg px-3 py-2">
            <Plus className="w-4 h-4" /> Legg til avdeling
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Lagrer…" : `Lagre ${flate === "kunde" ? "kunde" : "intern"}-avdelinger`}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
