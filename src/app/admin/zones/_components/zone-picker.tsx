"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { PREDEFINED_LAYOUTS, type PredefinedLayout } from "@/lib/zones/predefined-layouts"
import { saveZoneLayout } from "../actions"
import type { Json } from "@/types/database"

interface ZonePickerProps {
  currentLayoutId: string | null
}

function LayoutPreview({ layout }: { layout: PredefinedLayout }) {
  return (
    <div className="relative w-full aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
      {layout.zones.map((zone) => (
        <div
          key={zone.id}
          className="absolute border border-zinc-500 flex items-center justify-center"
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.w}%`,
            height: `${zone.h}%`,
          }}
        >
          <span className="text-zinc-400 text-[9px] font-medium uppercase tracking-wider px-1 text-center leading-tight">
            {zone.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ZonePicker({ currentLayoutId }: ZonePickerProps) {
  const [selected, setSelected] = useState(currentLayoutId ?? "fullscreen")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const layout = PREDEFINED_LAYOUTS.find((l) => l.id === selected)
    if (!layout) return
    setSaving(true)
    setError(null)
    const res = await saveZoneLayout(selected, layout as unknown as Json)
    setSaving(false)
    if (!res.ok) { setError(res.error ?? "Feil"); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {PREDEFINED_LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            onClick={() => setSelected(layout.id)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              selected === layout.id
                ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900 ring-offset-1"
                : "border-zinc-200 hover:border-zinc-300 bg-white"
            }`}
          >
            <LayoutPreview layout={layout} />
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900">{layout.name}</p>
                {selected === layout.id && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{layout.description}</p>
              <div className="flex gap-1 mt-2">
                {layout.zones.map((z) => (
                  <span key={z.id} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                    {z.label}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || selected === currentLayoutId}
          className="flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Lagrer..." : saved ? "Lagret ✓" : "Lagre layout"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Layouten er lagret og vil brukes på alle skjermer.</p>}
      </div>
    </div>
  )
}
