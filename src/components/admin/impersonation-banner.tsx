"use client"

import { setActiveTenant } from "@/app/admin/plattform/actions"
import { LogOut } from "lucide-react"

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="mx-2 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Opptrer som</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-amber-900 truncate">{tenantName}</span>
        <form action={setActiveTenant.bind(null, null)}>
          <button
            type="submit"
            className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900"
            title="Avslutt"
          >
            <LogOut className="w-3 h-3" /> Avslutt
          </button>
        </form>
      </div>
    </div>
  )
}
