"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tag, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { saveTenantTerminology, uploadTenantLogo } from "./actions"

/**
 * Lar en tenant-admin sette hva en «enhet» kalles (Butikk vs Forhandler). Hele
 * admin-UI-et bruker disse verdiene via useTenantConfig, så én endring her bytter
 * meny, overskrifter, målretting og tellere overalt — per kunde.
 */
export function TenantTerminologyCard() {
  const router = useRouter()
  const { unitLabel, unitLabelPlural, logoUrl } = useTenantConfig()
  const [singular, setSingular] = useState(unitLabel)
  const [plural, setPlural] = useState(unitLabelPlural)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const dirty = singular.trim() !== unitLabel || plural.trim() !== unitLabelPlural

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set("file", file)
    setUploading(true)
    const res = await uploadTenantLogo(fd)
    setUploading(false)
    if (res.ok) { toast.success("Logo lastet opp"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke laste opp logo")
  }

  async function save() {
    if (!singular.trim() || !plural.trim()) {
      toast.error("Fyll inn både entall og flertall")
      return
    }
    setSaving(true)
    const res = await saveTenantTerminology(singular, plural)
    setSaving(false)
    if (res.ok) {
      toast.success("Terminologi lagret")
      router.refresh()
    } else {
      toast.error(res.error ?? "Kunne ikke lagre")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-500" />
          Organisasjon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl border border-zinc-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-zinc-300">{(singular || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <label className={`inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-2 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="w-4 h-4" /> {uploading ? "Laster opp…" : logoUrl ? "Bytt logo" : "Last opp logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogo} disabled={uploading} />
            </label>
            <p className="text-[11px] text-zinc-400 mt-1">Organisasjons-logo — vises i sidemeny og organisasjons-velger. PNG/JPG/WEBP/SVG, maks 5 MB.</p>
          </div>
        </div>

        <p className="text-sm text-zinc-500">
          Hva kalles en enhet i denne organisasjonen? Endres her og slår gjennom i meny, overskrifter og målretting overalt.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Entall</span>
            <input
              value={singular}
              onChange={(e) => setSingular(e.target.value)}
              placeholder="Butikk"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Flertall</span>
            <input
              value={plural}
              onChange={(e) => setPlural(e.target.value)}
              placeholder="Butikker"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
            />
          </label>
        </div>
        <p className="text-[11px] text-zinc-400">
          F.eks. «Forhandler» / «Forhandlere» for en bilforhandler, «Butikk» / «Butikker» for dagligvare.
        </p>
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {saving ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
