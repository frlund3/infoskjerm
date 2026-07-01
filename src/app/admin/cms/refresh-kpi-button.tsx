"use client"

import { useState, useTransition } from "react"
import { RefreshCw, Check, AlertTriangle } from "lucide-react"
import { syncKpiNow } from "./kpi-actions"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"

/**
 * "Oppdater KPI nå" — pulls the latest week from Gange-Rolv Drift on demand, so
 * staff don't have to wait for the daily cron after loading a new week. Shows a
 * short inline result; the KPI screens auto-reload on their own interval.
 */

type Status = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "error"; text: string }

export function RefreshKpiButton() {
  const { unitLabelPlural } = useTenantConfig()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  function handleClick() {
    setStatus({ kind: "idle" })
    startTransition(async () => {
      const res = await syncKpiNow()
      if (res.ok) {
        setStatus({ kind: "ok", text: `Oppdatert: ${res.result.kpiWeeks} ukerader, ${res.result.svinnStores} ${unitLabelPlural.toLowerCase()}` })
      } else {
        setStatus({ kind: "error", text: res.error })
      }
    })
  }

  return (
    <div className="flex items-center gap-2.5">
      {status.kind === "ok" && (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
          <Check className="w-3.5 h-3.5" /> {status.text}
        </span>
      )}
      {status.kind === "error" && (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600" title={status.text}>
          <AlertTriangle className="w-3.5 h-3.5" /> Feilet
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-60 px-3.5 py-2 rounded-lg transition-colors"
        title="Hent siste uke fra Gange-Rolv Drift nå"
      >
        <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Oppdaterer…" : "Oppdater KPI nå"}
      </button>
    </div>
  )
}
