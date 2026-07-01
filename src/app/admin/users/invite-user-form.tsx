"use client"

import { useState } from "react"
import { UserPlus, X, Loader2, Store as StoreIcon } from "lucide-react"
import { inviteUser } from "./actions"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"

import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles"

export type InviteRole = "chain_manager" | "area_manager" | "store_manager"

type Store = { id: string; name: string }

// Redaktør (store_employee) er utfaset — ikke lenger tildelbar.
const ROLE_META: Record<InviteRole, { label: string; desc: string }> = {
  chain_manager: { label: ROLE_LABELS.chain_manager, desc: ROLE_DESCRIPTIONS.chain_manager },
  area_manager: { label: ROLE_LABELS.area_manager, desc: ROLE_DESCRIPTIONS.area_manager },
  store_manager: { label: ROLE_LABELS.store_manager, desc: ROLE_DESCRIPTIONS.store_manager },
}

const ALL_INVITE_ROLES: InviteRole[] = ["chain_manager", "area_manager", "store_manager"]

// Roller som er scopet til spesifikke butikker (Tenant Admin får alle).
const STORE_SCOPED: InviteRole[] = ["area_manager", "store_manager"]
// Roller som kun kan ha én butikk.
const SINGLE_STORE: InviteRole[] = ["store_manager"]

export function InviteUserForm({
  stores,
  allowedRoles = ALL_INVITE_ROLES,
}: {
  stores: Store[]
  allowedRoles?: InviteRole[]
}) {
  const { unitLabel, unitLabelPlural } = useTenantConfig()
  const roleOptions = (allowedRoles.length > 0 ? allowedRoles : ALL_INVITE_ROLES).map((value) => ({
    value,
    label: ROLE_META[value].label,
    desc: ROLE_META[value].desc,
  }))
  const singleRole = roleOptions.length === 1

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteRole>(roleOptions[0].value)
  const [storeIds, setStoreIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const needsStores = STORE_SCOPED.includes(role)
  const singleStore = SINGLE_STORE.includes(role)

  function selectRole(next: InviteRole) {
    setRole(next)
    setError(null)
    // Bytter man til/fra én-butikk-rolle, behold maks én.
    if (SINGLE_STORE.includes(next)) setStoreIds((ids) => ids.slice(0, 1))
    if (!STORE_SCOPED.includes(next)) setStoreIds([])
  }

  function toggleStore(id: string) {
    setError(null)
    setStoreIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id)
      if (singleStore) return [id]
      return [...ids, id]
    })
  }

  function reset() {
    setEmail("")
    setRole(roleOptions[0].value)
    setStoreIds([])
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    if (needsStores && storeIds.length === 0) {
      setError(`Velg minst én ${unitLabel.toLowerCase()} for denne rollen.`)
      return
    }
    setLoading(true)
    setError(null)
    const result = await inviteUser(email.trim(), role, storeIds)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke sende invitasjon")
    } else {
      setSuccess(true)
      reset()
      setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Inviter bruker
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-900">Inviter ny bruker</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Invitasjon sendt!</p>
            <p className="text-xs text-zinc-500 mt-1">Brukeren får en e-post med lenke for å sette passord.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">E-postadresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bruker@eksempel.no"
                required
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-2">Rolle</label>
              {singleRole ? (
                <div className="rounded-xl border-2 border-zinc-900 bg-zinc-50 p-3">
                  <p className="text-sm font-semibold text-zinc-900">{roleOptions[0].label}</p>
                  <p className="text-xs text-zinc-500">{roleOptions[0].desc}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {roleOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        role === opt.value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={role === opt.value}
                        onChange={() => selectRole(opt.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                        <p className="text-xs text-zinc-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {needsStores ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    {singleStore ? `Velg ${unitLabel.toLowerCase()}` : `Velg ${unitLabelPlural.toLowerCase()}`}
                  </label>
                  <span className="text-[11px] text-zinc-400">{storeIds.length} valgt</span>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                  {stores.length === 0 ? (
                    <p className="text-xs text-zinc-400 px-3 py-3">{`Ingen ${unitLabelPlural.toLowerCase()} funnet.`}</p>
                  ) : (
                    stores.map((s) => {
                      const checked = storeIds.includes(s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                            checked ? "bg-emerald-50" : "hover:bg-zinc-50"
                          }`}
                        >
                          <input
                            type={singleStore ? "radio" : "checkbox"}
                            name="store"
                            checked={checked}
                            onChange={() => toggleStore(s.id)}
                            className="accent-emerald-600"
                          />
                          <StoreIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-sm text-zinc-800">{s.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                <StoreIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">
                  Tenant Admin får automatisk tilgang til <strong>alle {unitLabelPlural.toLowerCase()}</strong>.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? "Sender..." : "Send invitasjon"}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
