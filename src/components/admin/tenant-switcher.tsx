"use client"

import { useState } from "react"
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react"
import { setActiveTenant } from "@/app/admin/plattform/actions"
import { cn } from "@/lib/utils"

export interface SwitcherTenant {
  id: string
  name: string
  slug: string
}

/**
 * Organisasjons-velger øverst i sidemenyen. Kun synlig for super_admin som kan
 * opptre som mer enn én tenant — én-tenant-brukere ser den aldri. Erstatter den
 * gamle full-side «Plattform»-kortvelgeren: knapp med aktiv org → nedtrekk med
 * søkefelt + liste. Valg kaller setActiveTenant (cookie + redirect).
 */
export function TenantSwitcher({ tenants, activeTenantId }: { tenants: SwitcherTenant[]; activeTenantId: string | null }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  // Ingenting å bytte mellom → ikke vis velgeren i det hele tatt.
  if (tenants.length < 2) return null

  const active = tenants.find((t) => t.id === activeTenantId) ?? null
  const q = query.trim().toLowerCase()
  const filtered = q ? tenants.filter((t) => `${t.name} ${t.slug}`.toLowerCase().includes(q)) : tenants

  return (
    <div className="relative mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-all text-left"
      >
        <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
          <Building2 className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 leading-none">Organisasjon</span>
          <span className="block text-sm font-semibold text-zinc-900 truncate leading-tight mt-0.5">{active?.name ?? "Velg organisasjon"}</span>
        </span>
        <ChevronsUpDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
            <div className="relative border-b border-zinc-100 p-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk organisasjon…"
                className="w-full text-sm bg-zinc-50 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-xs text-zinc-400">Ingen treff</li>
              )}
              {filtered.map((t) => {
                const isActive = t.id === activeTenantId
                return (
                  <li key={t.id}>
                    <form action={setActiveTenant.bind(null, t.id)}>
                      <button
                        type="submit"
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 transition-colors",
                          isActive && "bg-zinc-50"
                        )}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-zinc-900 truncate">{t.name}</span>
                          <span className="block text-[11px] text-zinc-400 truncate">{t.slug}</span>
                        </span>
                        {isActive && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      </button>
                    </form>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
