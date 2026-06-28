"use client"

import { useState } from "react"
import { CheckCircle2, ChevronRight, Building2, Store, Monitor, Loader2 } from "lucide-react"
import { createTenant, createChainForTenant, createStoreForChain } from "../actions"

type ChainType = "SPAR" | "EUROSPAR" | "JOKER"

const CHAIN_DEFAULTS: Record<ChainType, { color: string }> = {
  SPAR: { color: "#007B40" },
  EUROSPAR: { color: "#007B40" },
  JOKER: { color: "#E30613" },
}

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Tenant
  const [tenantName, setTenantName] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [tenantId, setTenantId] = useState<string | null>(null)

  // Step 2: Chain
  const [chainType, setChainType] = useState<ChainType>("SPAR")
  const [chainColor, setChainColor] = useState("#007B40")
  const [chainId, setChainId] = useState<string | null>(null)

  // Step 3: Store
  const [storeName, setStoreName] = useState("")

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  async function handleTenant() {
    if (!tenantName.trim() || !tenantSlug.trim()) return
    setLoading(true); setError(null)
    const res = await createTenant(tenantName.trim(), tenantSlug.trim())
    setLoading(false)
    if (!res.ok) { setError(res.error ?? "Feil"); return }
    setTenantId(res.tenantId!)
    setStep(2)
  }

  async function handleChain() {
    if (!tenantId) return
    setLoading(true); setError(null)
    const res = await createChainForTenant(tenantId, chainType, chainColor)
    setLoading(false)
    if (!res.ok) { setError(res.error ?? "Feil"); return }
    setChainId(res.chainId!)
    setStep(3)
  }

  async function handleStore() {
    if (!tenantId || !chainId || !storeName.trim()) return
    setLoading(true); setError(null)
    const res = await createStoreForChain(tenantId, chainId, storeName.trim())
    setLoading(false)
    if (!res.ok) { setError(res.error ?? "Feil"); return }
    setStep(4)
  }

  const steps = [
    { n: 1, icon: Building2, label: "Tenant" },
    { n: 2, icon: Building2, label: "Kjede" },
    { n: 3, icon: Store, label: "Butikk" },
    { n: 4, icon: Monitor, label: "Ferdig" },
  ]

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === n ? "bg-zinc-900 text-white" : step > n ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
            }`}>
              {step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 text-center">{n}</span>}
              {label}
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Tenant */}
      {step === 1 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Opprett tenant</h2>
            <p className="text-sm text-zinc-500">En tenant er en organisasjon som bruker infoskjerm-plattformen.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Organisasjonsnavn</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => { setTenantName(e.target.value); setTenantSlug(autoSlug(e.target.value)) }}
              placeholder="f.eks. NorgesGruppen Vest AS"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Slug (unik URL-ID)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">infoskjerm.no/</span>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(autoSlug(e.target.value))}
                placeholder="norgesgruppen-vest"
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 font-mono"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleTenant}
            disabled={loading || !tenantName.trim() || !tenantSlug.trim()}
            className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Opprett tenant
          </button>
        </div>
      )}

      {/* Step 2: Chain */}
      {step === 2 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Legg til kjede</h2>
            <p className="text-sm text-zinc-500">Velg hvilken kjede denne tenanten opererer.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["SPAR", "EUROSPAR", "JOKER"] as ChainType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setChainType(type); setChainColor(CHAIN_DEFAULTS[type].color) }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  chainType === type ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: CHAIN_DEFAULTS[type].color }} />
                <p className="text-sm font-bold text-zinc-900">{type}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Primærfarge</label>
            <div className="flex items-center gap-2">
              <input type="color" value={chainColor} onChange={(e) => setChainColor(e.target.value)} className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer" />
              <span className="text-sm font-mono text-zinc-500">{chainColor}</span>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleChain}
            disabled={loading}
            className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Opprett kjede
          </button>
        </div>
      )}

      {/* Step 3: Store */}
      {step === 3 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Opprett første butikk</h2>
            <p className="text-sm text-zinc-500">Legg til første butikk for denne kjeden. Flere kan legges til senere.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Butikknavn</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="f.eks. SPAR Ålesund Sentrum"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleStore}
            disabled={loading || !storeName.trim()}
            className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Opprett butikk
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Tenant opprettet!</h2>
          <p className="text-zinc-500 mb-6">
            Tenanten er klar. Neste steg er å registrere en Raspberry Pi og invitere brukere.
          </p>
          <div className="bg-zinc-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hva er opprettet</p>
            <div className="text-sm text-zinc-700 space-y-1">
              <p>✓ Tenant: <span className="font-medium">{tenantName}</span></p>
              <p>✓ Kjede: <span className="font-medium">{chainType}</span></p>
              <p>✓ Butikk: <span className="font-medium">{storeName}</span></p>
            </div>
          </div>
          <div className="flex gap-3">
            <a href="/admin/screens" className="flex-1 bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-700 transition-colors text-center">
              Registrer skjerm
            </a>
            <a href="/admin/users" className="flex-1 border border-zinc-200 text-zinc-700 text-sm font-medium py-2.5 rounded-xl hover:bg-zinc-50 transition-colors text-center">
              Inviter bruker
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
