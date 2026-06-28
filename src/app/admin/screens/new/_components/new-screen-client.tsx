"use client"

import { useState } from "react"
import { Monitor, Copy, CheckCircle, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createRegistrationCode } from "../actions"
import { toast } from "sonner"

interface Store {
  id: string
  name: string
  chains: { name: string; color: string } | null
}

export function NewScreenClient({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const result = await createRegistrationCode(selectedStore || null)
    setLoading(false)
    if (!result.ok) { toast.error(result.error ?? "Feil"); return }
    setCode(result.code!)
    setExpiresAt(result.expiresAt!)
    toast.success("Registreringskode generert")
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Kopiert!")
    setTimeout(() => setCopied(false), 2000)
  }

  const piCommand = code
    ? `REGISTER_CODE=${code} bash <(curl -fsSL https://infoskjerm.no/pi/setup.sh)`
    : ""

  return (
    <div className="max-w-xl space-y-6">
      {/* Step 1: Velg butikk */}
      <div className="bg-white rounded-xl border border-zinc-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-sm font-bold flex items-center justify-center">1</div>
          <h2 className="font-semibold text-zinc-900">Velg butikk (valgfritt)</h2>
        </div>
        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
        >
          <option value="">— Ingen butikk valgt —</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.chains?.name ? `${store.chains.name} — ` : ""}{store.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-400 mt-2">Du kan koble skjermen til en butikk nå eller senere via skjermstyrings-panelet.</p>
      </div>

      {/* Step 2: Generer kode */}
      <div className="bg-white rounded-xl border border-zinc-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-sm font-bold flex items-center justify-center">2</div>
          <h2 className="font-semibold text-zinc-900">Generer registreringskode</h2>
        </div>

        {!code ? (
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? "Genererer..." : "Generer kode"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-950 rounded-xl p-6 text-center">
              <p className="text-zinc-400 text-xs mb-2 uppercase tracking-widest">Registreringskode</p>
              <p className="text-5xl font-black text-white tracking-[0.2em] font-mono">{code}</p>
              <p className="text-zinc-500 text-xs mt-3">
                Utløper {expiresAt ? new Date(expiresAt).toLocaleString("nb-NO") : "om 24 timer"}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => handleCopy(code)}>
              {copied ? <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
              Kopier kode
            </Button>
          </div>
        )}
      </div>

      {/* Step 3: Pi-kommando */}
      {code && (
        <div className="bg-white rounded-xl border border-zinc-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-sm font-bold flex items-center justify-center">3</div>
            <h2 className="font-semibold text-zinc-900">Kjør på Raspberry Pi</h2>
          </div>
          <p className="text-sm text-zinc-500 mb-4">Kopier og kjør denne kommandoen i terminalen på din Raspberry Pi:</p>
          <div className="bg-zinc-950 rounded-xl p-4 flex items-start gap-3">
            <Terminal className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <code className="text-xs text-emerald-400 font-mono break-all flex-1">{piCommand}</code>
            <button onClick={() => handleCopy(piCommand)} className="text-zinc-400 hover:text-white transition-colors flex-shrink-0">
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-700">Manuell registrering:</p>
            <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
              <li>Installer Raspberry Pi OS Lite på SD-kortet</li>
              <li>Koble Pi til internett via ethernet eller WiFi</li>
              <li>Åpne terminal og lim inn kommandoen over</li>
              <li>Skjermen registreres automatisk og vises i skjerm-kartet</li>
            </ol>
          </div>
        </div>
      )}

      {/* Monitor icon */}
      {!code && (
        <div className="flex items-center justify-center py-8 text-zinc-200">
          <Monitor className="w-16 h-16" />
        </div>
      )}
    </div>
  )
}
