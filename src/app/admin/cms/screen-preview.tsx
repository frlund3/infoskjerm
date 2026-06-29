"use client"

import { useEffect, useRef, useState } from "react"
import { Monitor, ImageIcon, ChevronDown } from "lucide-react"

/**
 * Live, in-app preview of exactly what plays on a store's screen — composed from
 * the same widgets Xibo embeds (topbar strip + news), shown at true 16:9 scale.
 * A second tab previews the full-screen offer page. CMS users never touch Xibo.
 *
 * NB: keep the zone geometry (STRIP_H / STAGE_*) in sync with the Xibo layout in
 * scripts/xibo/lib.mjs buildLayout — otherwise this preview drifts from reality.
 */

export interface PreviewStore {
  id: string
  name: string
  city: string | null
  lat: number | null
  lon: number | null
  hasOffers: boolean
}

const STAGE_W = 1920
const STAGE_H = 1080
const STRIP_H = 180

export function ScreenPreview({ stores }: { stores: PreviewStore[] }) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "")
  const [tab, setTab] = useState<"skjerm" | "tilbud">("skjerm")
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const store = stores.find((s) => s.id === storeId) ?? stores[0]
  if (!store) return <p className="text-sm text-zinc-500">Ingen butikker ennå.</p>

  const navn = store.city || store.name
  const topbarSrc = `/widget/topbar?butikk=${encodeURIComponent(store.name)}&lat=${store.lat ?? ""}&lon=${store.lon ?? ""}&navn=${encodeURIComponent(navn)}`
  const newsSrc = `/widget/nyheter?store=${store.id}`
  const tilbudSrc = `/widget/tilbud?store=${store.id}`

  const tabBtn = (key: "skjerm" | "tilbud", label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setTab(key)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tab === key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="appearance-none text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.hasOffers ? "  • tilbud aktivt" : ""}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="flex gap-1.5">
          {tabBtn("skjerm", "Skjerm", Monitor)}
          {tabBtn("tilbud", store.hasOffers ? "Tilbud (aktivt)" : "Tilbud", ImageIcon)}
        </div>
        {tab === "tilbud" && !store.hasOffers && (
          <span className="text-xs text-zinc-400">Vises kun på skjermen når butikken har aktive tilbud.</span>
        )}
      </div>

      {/* 16:9 stage, scaled to the real 1920×1080 screen */}
      <div ref={wrapRef} className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-black shadow-sm" style={{ aspectRatio: "16 / 9" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {tab === "skjerm" ? (
            <>
              <iframe title="Toppstripe" src={topbarSrc} scrolling="no" style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STRIP_H, border: "none" }} />
              <iframe title="Innhold" src={newsSrc} scrolling="no" style={{ position: "absolute", top: STRIP_H, left: 0, width: STAGE_W, height: STAGE_H - STRIP_H, border: "none" }} />
            </>
          ) : (
            <iframe title="Tilbud" src={tilbudSrc} scrolling="no" style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STAGE_H, border: "none" }} />
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Live forhåndsvisning — nøyaktig de samme elementene som vises på skjermen i butikken. Skjermen veksler automatisk mellom innhold{store.hasOffers ? " og tilbud" : ""}.
      </p>
    </div>
  )
}
