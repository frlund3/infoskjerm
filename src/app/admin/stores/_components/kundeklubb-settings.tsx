"use client"

import { useState } from "react"
import { updateStoreKundeklubb } from "../actions"
import { LivePreview } from "../../innhold/_components/live-preview"
import { toast } from "sonner"
import { Loader2, QrCode } from "lucide-react"

/**
 * Per-store customer-club settings: on/off toggle + the QR target URL (the
 * store's own sign-up link — different per store) + card text. When enabled,
 * the customer screen shows a QR card pointing to this URL.
 */
export function KundeklubbSettings({
  storeId,
  initial,
}: {
  storeId: string
  initial: { enabled: boolean; url: string; headline: string; subtext: string; cta: string }
}) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [url, setUrl] = useState(initial.url)
  const [headline, setHeadline] = useState(initial.headline)
  const [subtext, setSubtext] = useState(initial.subtext)
  const [cta, setCta] = useState(initial.cta)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await updateStoreKundeklubb(storeId, { enabled, url, headline, subtext, cta })
    setSaving(false)
    if (res.ok) toast.success("Kundeklubb lagret")
    else toast.error(res.error ?? "Noe gikk galt")
  }

  const field = "w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-900">Kundeklubb</h2>
        </div>
        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-zinc-300"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Når den er på, viser kundeskjermen et QR-kort. Lar du lenka stå tom, går QR-koden
        til den <strong>innebygde påmeldingssiden</strong> — kunden registrerer seg der og
        havner i medlemslista. Vil du heller bruke en ekstern side, legg inn lenka under.
      </p>

      <div className={enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wide">QR-lenke (valgfri)</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Tom = innebygd påmeldingsside" className={field} inputMode="url" />
          <p className="text-[10px] text-zinc-400 mt-1">{url.trim() ? "QR-koden peker til denne lenken." : "QR-koden bruker den innebygde påmeldingssiden (/klubb)."}</p>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wide">Overskrift</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Bli medlem – det er gratis" className={field} />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wide">Undertekst</label>
          <input value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="Medlemspriser, bonus og ukens beste tilbud." className={field} />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wide">Tekst under QR-kode</label>
          <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="📱 Skann for å melde deg inn" className={field} />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--brand-primary)" }}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lagre kundeklubb"}
      </button>

      {enabled && (
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-2">Forhåndsvisning</p>
          <LivePreview portrait data={{ type: "slide", audience: "kunde", klubb: { headline, subtext, url, cta } }} />
        </div>
      )}
    </div>
  )
}
