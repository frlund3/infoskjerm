"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setUserStores } from "./actions"
import { Store, Check, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"

interface StoreOpt { id: string; name: string }

export function UserStoreAccess({
  userId,
  allStores,
  currentStoreIds,
}: {
  userId: string
  allStores: StoreOpt[]
  currentStoreIds: string[]
}) {
  const router = useRouter()
  const { unitLabel, unitLabelPlural } = useTenantConfig()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentStoreIds)
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function save() {
    setSaving(true)
    const res = await setUserStores(userId, selected)
    setSaving(false)
    if (res.ok) { toast.success("Tilgang oppdatert"); setOpen(false); router.refresh() }
    else toast.error(res.error ?? "Feil")
  }

  const label = selected.length === 0 ? `Velg ${unitLabelPlural.toLowerCase()}` : `${selected.length} ${selected.length === 1 ? unitLabel.toLowerCase() : unitLabelPlural.toLowerCase()}`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-50"
      >
        <Store className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg">
            <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Butikktilgang</span>
              <button onClick={() => setSelected(allStores.map((s) => s.id))} className="text-[11px] text-zinc-400 hover:text-zinc-600">Velg alle</button>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {allStores.map((s) => (
                <button key={s.id} onClick={() => toggle(s.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 text-left">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(s.id) ? "bg-zinc-900 border-zinc-900" : "border-zinc-300"}`}>
                    {selected.includes(s.id) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="text-xs text-zinc-700 truncate">{s.name}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-zinc-100 flex justify-end">
              <button onClick={save} disabled={saving} className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary)" }}>
                {saving ? "Lagrer..." : "Lagre tilgang"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
