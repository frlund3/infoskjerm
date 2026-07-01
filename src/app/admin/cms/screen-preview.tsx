"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Monitor, ChevronDown, RefreshCw, Camera, Wifi, WifiOff, Megaphone } from "lucide-react"
import type { StoreScreen, ScreenSync } from "@/lib/xibo/screens"
import { pushToScreen, requestNewScreenshot } from "./actions"
import { useTenantConfig, useTenantFeature } from "@/components/admin/tenant-config-provider"

/**
 * Live, in-app preview of exactly what plays on a store's screen — composed from
 * the same widgets Xibo embeds (topbar strip + news), shown at true 16:9 scale.
 * A second tab previews the full-screen offer page. Above it, an ops panel shows
 * live player status (online / sync / current layout), a "push now" button, and
 * the real screenshot from the player. CMS users never touch Xibo directly.
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

// Top strip height on the internal landscape stage (store name + clock + weather).
const STRIP_H = 150

// Customer screens are always portrait (1080×1920); internal/back-room landscape.
// Avdelinger lastes per tenant (bil vs mat) via useTenantConfig().

const SYNC_BADGE: Record<ScreenSync, { label: string; cls: string }> = {
  ok: { label: "Oppdatert", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  downloading: { label: "Laster ned", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  stale: { label: "Utdatert", cls: "bg-red-50 text-red-700 border-red-200" },
  unknown: { label: "Ukjent", cls: "bg-zinc-50 text-zinc-500 border-zinc-200" },
}

export function ScreenPreview({
  stores,
  screens,
  brand,
}: {
  stores: PreviewStore[]
  screens: Record<string, StoreScreen[]>
  brand: string
}) {
  const { avdelinger: AVDELINGER, avdelingerIntern: AVDELINGER_INTERN, unitLabel, unitLabelPlural } = useTenantConfig()
  // Butikk-KPI + «Alle butikker» er dagligvare (svinn/omsetning fra Gange-Rolv Drift)
  // — skjul dem for ikke-dagligvare-tenants (f.eks. bilforhandlere).
  const canKpi = useTenantFeature("offerCards")
  // Land on a store that actually has a screen registered — else the operator
  // opens the page on an empty store and thinks a screen is missing/misbound.
  const firstWithScreen = stores.find((s) => (screens[s.id]?.length ?? 0) > 0)
  const [storeId, setStoreId] = useState(firstWithScreen?.id ?? stores[0]?.id ?? "")
  const [avdeling, setAvdeling] = useState("felles")
  const [view, setView] = useState<View>("intern-innhold")
  const [oversiktPeriode, setOversiktPeriode] = useState<"uke" | "ar">("uke")
  const [kundeView, setKundeView] = useState<"tilbud" | "klubb">("tilbud")
  // Orienterings-overstyring: null = naturlig (kunde stående, intern liggende);
  // ellers tvunget stående/liggende så begge kan forhåndsvises.
  const [orientPref, setOrientPref] = useState<"portrait" | "landscape" | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const flate = view.startsWith("kunde") ? "kunde" : "intern"

  // Standard: kunde = stående 1080×1920, intern = liggende 1920×1080. Toggle overstyrer.
  const portrait = orientPref ? orientPref === "portrait" : flate === "kunde"
  const orient = portrait ? "portrait" : "landscape"
  const STAGE_W = portrait ? 1080 : 1920
  const STAGE_H = portrait ? 1920 : 1080

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [STAGE_W])

  const store = stores.find((s) => s.id === storeId) ?? stores[0]
  if (!store) return <p className="text-sm text-zinc-500">Ingen {unitLabelPlural.toLowerCase()} ennå.</p>

  const storeScreens = screens[store.id] ?? []
  // Filter the screen list to the selected flate: Kundeskjerm → customer-facing
  // (kunde + avdeling); Internskjerm → bakrom only.
  const visibleScreens = storeScreens.filter((s) => (flate === "intern" ? s.role === "bakrom" : s.role !== "bakrom"))
  const sid = encodeURIComponent(store.id)
  // Avdelingene er ulike for kunde vs intern — velg riktig liste for aktiv flate.
  const avdelingerForFlate = flate === "intern" ? AVDELINGER_INTERN : AVDELINGER
  const av = encodeURIComponent(avdeling)
  const tilbudSrc = `/widget/tilbud?store=${sid}&avdeling=${av}&o=${orient}`
  const kpiSrc = `/widget/butikk-kpi?store=${sid}&o=${orient}`
  const oversiktSrc = `/widget/kpi-oversikt?store=${sid}&o=${orient}`
  const internInnholdSrc = `/widget/nyheter?store=${sid}&flate=intern&avdeling=${av}&o=${orient}`
  const kundeklubbSrc = `/widget/kundeklubb?store=${sid}`
  const kundeSrc = kundeView === "klubb" ? kundeklubbSrc : tilbudSrc
  const topbarSrc = `/widget/topbar?butikk=${encodeURIComponent(store.name)}&lat=${store.lat ?? ""}&lon=${store.lon ?? ""}&navn=${encodeURIComponent(store.city ?? "")}${brand ? `&merke=${encodeURIComponent(brand)}` : ""}`
  // Internal "innhold" screen carries the top strip (store name + clock + date +
  // weather) above the rotating news + ticker — like the real bakrom layout.
  const showStrip = view === "intern-innhold"
  const oversiktFull = oversiktPeriode === "ar" ? `${oversiktSrc}&periode=ar` : oversiktSrc
  const internContentSrc = view === "intern-kpi" ? kpiSrc : view === "intern-innhold" ? internInnholdSrc : oversiktFull

  // Kunde = ett portrett-skjermbilde (toppstripe + tilbud/avis). Intern = 3 faner.
  const subTabs: { key: View; label: string }[] =
    flate === "kunde"
      ? []
      : [
          { key: "intern-innhold" as View, label: "Internt innhold" },
          ...(canKpi
            ? [
                { key: "intern-kpi" as View, label: `${unitLabel}-KPI` },
                { key: "intern-oversikt" as View, label: `Alle ${unitLabelPlural.toLowerCase()}` },
              ]
            : []),
        ]

  return (
    <div className="space-y-4">
      {/* Store + flate (kunde vs intern) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full sm:w-auto appearance-none text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          >
            {stores.map((s) => {
              const n = screens[s.id]?.length ?? 0
              return (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {n > 0 ? `  • ${n} skjerm${n > 1 ? "er" : ""}` : ""}
                  {s.hasOffers ? "  • tilbud aktivt" : ""}
                </option>
              )
            })}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="flex w-full sm:w-auto sm:inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
          <button onClick={() => { setView("kunde-skjerm"); setAvdeling("felles"); setOrientPref(null) }} className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${flate === "kunde" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>
            <Megaphone className="w-3.5 h-3.5 shrink-0" /> Kundeskjerm
          </button>
          <button onClick={() => { setView("intern-innhold"); setAvdeling("felles"); setOrientPref(null) }} className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${flate === "intern" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>
            <Monitor className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Internskjerm <span className="hidden sm:inline">(bakrom)</span></span>
          </button>
        </div>

        {/* Orientering — forhåndsvis samme skjerm stående og liggende. */}
        <div className="flex w-full sm:w-auto sm:inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
          <button onClick={() => setOrientPref("portrait")} className={`flex flex-1 sm:flex-none items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${portrait ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>Stående</button>
          <button onClick={() => setOrientPref("landscape")} className={`flex flex-1 sm:flex-none items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!portrait ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>Liggende</button>
        </div>
      </div>

      {/* Sub-view within the flate (intern only) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {subTabs.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${view === t.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
            <Monitor className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
        {flate === "kunde" && (
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
            {([["tilbud", "Tilbud / avis"], ["klubb", "Kundeklubb"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setKundeView(key)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${kundeView === key ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {/* Avdeling — for BEGGE flater (kunde-skjerm + intern nyhetsflate). Egne lister per flate. */}
        {(flate === "kunde" || view === "intern-innhold") && (
          <div className="relative">
            <select value={avdeling} onChange={(e) => setAvdeling(e.target.value)}
              className="appearance-none text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300">
              {avdelingerForFlate.map((a) => <option key={a.key} value={a.key}>Avdeling: {a.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
        {flate === "kunde" && (
          <span className="text-xs text-zinc-400">Stående — tilbud/kundeavis i full skjerm.</span>
        )}
        {view === "intern-oversikt" && (
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 ml-1">
            {([["uke", "Denne uka"], ["ar", "Hittil i år"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setOversiktPeriode(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${oversiktPeriode === key ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {flate === "intern" && (
          <span className="text-xs text-zinc-400">Bakrom/ansatte — vises aldri til kunder.</span>
        )}
      </div>

      {/* Ops panel — live player status, push-now, real screenshot (rolle-filtrert) */}
      <ScreenStatus key={`${store.id}-${flate}`} storeName={store.name} screens={visibleScreens} />

      {/* Scaled stage — portrait for customer, landscape for internal */}
      <div ref={wrapRef} className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-black shadow-sm mx-auto" style={{ aspectRatio: portrait ? "9 / 16" : "16 / 9", width: "100%", maxWidth: portrait ? 400 : undefined }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {flate === "intern" && showStrip && (
            <iframe
              title="topbar"
              src={topbarSrc}
              scrolling="no"
              style={{ position: "absolute", top: 0, left: 0, width: STAGE_W, height: STRIP_H, border: "none" }}
            />
          )}
          <iframe
            key={flate === "kunde" ? kundeSrc : internContentSrc}
            title={view}
            src={flate === "kunde" ? kundeSrc : internContentSrc}
            scrolling="no"
            style={{ position: "absolute", top: flate === "intern" && showStrip ? STRIP_H : 0, left: 0, width: STAGE_W, height: flate === "intern" && showStrip ? STAGE_H - STRIP_H : STAGE_H, border: "none" }}
          />
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        {flate === "kunde"
          ? `Kundeskjerm — det kundene ser i ${unitLabel.toLowerCase()}en (tilbud, plakater). Veksler automatisk mellom innhold og tilbud.`
          : "Internskjerm (bakrom) — KPI og driftstall for de ansatte. Aldri synlig for kunder."}
      </p>
    </div>
  )
}

type View = "kunde-skjerm" | "kunde-tilbud" | "intern-innhold" | "intern-kpi" | "intern-oversikt"

function ScreenStatus({ storeName, screens }: { storeName: string; screens: StoreScreen[] }) {
  const { unitLabel } = useTenantConfig()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  if (screens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 flex items-center gap-3">
        <WifiOff className="w-4 h-4 text-zinc-400 shrink-0" />
        <p className="text-xs text-zinc-500">
          Ingen skjerm tilkoblet ennå. En Raspberry Pi-spiller vises her automatisk når den meldes inn i skjermgruppen «{storeName}».
        </p>
      </div>
    )
  }

  const groupId = screens[0].displayGroupId

  const handlePush = () => {
    setNote(null)
    startTransition(async () => {
      const res = await pushToScreen(groupId)
      setNote(res.ok ? { kind: "ok", text: "Skjermene henter nytt innhold nå." } : { kind: "err", text: res.error })
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-700">
          {screens.length === 1 ? "1 skjerm" : `${screens.length} skjermer`} i {unitLabel.toLowerCase()}en
        </span>
        <button
          onClick={handlePush}
          disabled={pending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-700 hover:border-zinc-300 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${pending ? "animate-spin" : ""}`} /> Oppdater skjermen nå
        </button>
      </div>
      {note && (
        <p className={`px-4 py-1.5 text-xs ${note.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>{note.text}</p>
      )}
      <ul className="divide-y divide-zinc-100">
        {screens.map((s) => (
          <ScreenRow key={s.displayId} screen={s} />
        ))}
      </ul>
    </div>
  )
}

function ScreenRow({ screen }: { screen: StoreScreen }) {
  const [pending, startTransition] = useTransition()
  const [bust, setBust] = useState(0)
  const [shotError, setShotError] = useState(false)
  const badge = SYNC_BADGE[screen.sync]

  const handleShot = () => {
    startTransition(async () => {
      await requestNewScreenshot(screen.displayId)
      // The player uploads on its next collection — reload the image shortly after.
      setShotError(false)
      setTimeout(() => setBust((n) => n + 1), 4000)
    })
  }

  return (
    <li className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {screen.online ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-400" />}
          <span className="text-sm font-medium text-zinc-800 truncate">{screen.name}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {screen.online ? "Online" : "Offline"}
          {screen.currentLayout ? ` · viser «${screen.currentLayout}»` : ""}
          {screen.lastSeen ? ` · sist sett ${screen.lastSeen}` : ""}
          {screen.clientVersion ? ` · spiller v${screen.clientVersion}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-32 aspect-video rounded-md border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
          {shotError ? (
            <span className="text-[10px] text-zinc-400 px-1 text-center">Ingen skjermbilde ennå</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/admin/cms/skjermbilde/${screen.displayId}?t=${bust}`}
              alt={`Skjermbilde fra ${screen.name}`}
              className="w-full h-full object-cover"
              onError={() => setShotError(true)}
            />
          )}
        </div>
        <button
          onClick={handleShot}
          disabled={pending}
          title="Be om nytt skjermbilde"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:border-zinc-300 disabled:opacity-50 transition-all"
        >
          <Camera className={`w-3.5 h-3.5 ${pending ? "animate-pulse" : ""}`} /> Nytt
        </button>
      </div>
    </li>
  )
}
