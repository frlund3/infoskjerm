"use client"

import { useRef, useState } from "react"
import { Palette, CheckCircle2, ImagePlus, Loader2 } from "lucide-react"
import { updateChainBranding, uploadChainLogo } from "./actions"

interface Chain {
  id: string
  name: string
  color: string
  brand_light: string | null
  brand_fg: string | null
  logo_url: string | null
}

/** Per-chain logo upload — the logo shown on the offer card on customer screens. */
function LogoUploader({ chainId, name, initialUrl }: { chainId: string; name: string; initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    const res = await uploadChainLogo(chainId, fd)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setUrl(res.url)
  }

  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">Kjedelogo (vises på tilbud på kundeskjerm)</label>
      <div className="flex items-center gap-3">
        <div className="w-28 h-14 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${name} logo`} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-[11px] text-zinc-400">Ingen logo</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 border border-zinc-200 px-3.5 py-2 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {busy ? "Laster opp..." : url ? "Bytt logo" : "Last opp logo"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <p className="text-[11px] text-zinc-400 mt-1.5">PNG, JPG, WEBP eller SVG · maks 5 MB · gjerne med gjennomsiktig bakgrunn</p>
    </div>
  )
}

interface BrandingPanelProps {
  chains: Chain[]
}

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
        />
        <span className="text-xs font-mono text-zinc-500">{value}</span>
      </div>
    </div>
  )
}

export function BrandingPanel({ chains }: BrandingPanelProps) {
  const [values, setValues] = useState<Record<string, { color: string; brand_light: string; brand_fg: string }>>(
    Object.fromEntries(
      chains.map((c) => [
        c.id,
        {
          color: c.color,
          brand_light: c.brand_light ?? "#d1fae5",
          brand_fg: c.brand_fg ?? "#ffffff",
        },
      ])
    )
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(chainId: string, key: "color" | "brand_light" | "brand_fg", value: string) {
    setValues((prev) => ({
      ...prev,
      [chainId]: { ...prev[chainId], [key]: value },
    }))
  }

  async function handleSave(chainId: string) {
    const v = values[chainId]
    if (!v) return
    setSaving(chainId)
    setError(null)
    const res = await updateChainBranding(chainId, v.color, v.brand_light, v.brand_fg)
    setSaving(null)
    if (!res.ok) { setError(res.error ?? "Feil"); return }
    setSaved(chainId)
    setTimeout(() => setSaved(null), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-900">Fargetema per kjede</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Disse fargene brukes i admin-grensesnittet og på skjermene for din kjede.
      </p>

      {chains.map((chain) => {
        const v = values[chain.id]
        if (!v) return null
        return (
          <div key={chain.id} className="bg-white border border-zinc-100 rounded-xl p-5">
            {/* Chain header with live preview */}
            <div
              className="h-8 rounded-lg mb-4 flex items-center px-3"
              style={{ backgroundColor: v.color }}
            >
              <span className="text-sm font-bold" style={{ color: v.brand_fg }}>
                {chain.name}
              </span>
            </div>

            <LogoUploader chainId={chain.id} name={chain.name} initialUrl={chain.logo_url} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <ColorSwatch label="Primærfarge" value={v.color} onChange={(val) => update(chain.id, "color", val)} />
              <ColorSwatch label="Lysfarge" value={v.brand_light} onChange={(val) => update(chain.id, "brand_light", val)} />
              <ColorSwatch label="Forgrunnsfarger (tekst)" value={v.brand_fg} onChange={(val) => update(chain.id, "brand_fg", val)} />
            </div>

            {/* Live preview bar */}
            <div className="rounded-lg overflow-hidden mb-4 border border-zinc-100">
              <div className="h-8 flex items-center px-3 gap-2" style={{ backgroundColor: v.color }}>
                <div className="w-4 h-4 rounded" style={{ backgroundColor: v.brand_fg, opacity: 0.8 }} />
                <span className="text-xs font-semibold" style={{ color: v.brand_fg }}>Admin-navigasjon</span>
              </div>
              <div className="h-12 flex items-center px-3" style={{ backgroundColor: v.brand_light }}>
                <span className="text-xs" style={{ color: v.color }}>Bakgrunnsfarge for kort og seksjoner</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave(chain.id)}
                disabled={saving === chain.id}
                className="flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {saving === chain.id ? "Lagrer..." : saved === chain.id ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" />Lagret</>
                ) : "Lagre farger"}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
