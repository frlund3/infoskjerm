"use client"

import { useRef, useState } from "react"
import { Camera, X, Loader2, ImageUp, Check } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { saveContent } from "@/app/admin/innhold/actions"

/**
 * Mobil hurtig-flyt: knips et bilde (plakat/hylletilbud) → last opp til storage
 * → opprett et kundeskjerm-oppslag (slide, plakat, alle butikker) som utkast
 * eller publisert. Finjuster siden i den fulle editoren ved behov.
 * Vises kun på mobil (md:hidden) som en flytende kamera-knapp.
 */
export function QuickCapture() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setOpen(false)
    setPreview(null)
    setFile(null)
    setTitle("")
    setBusy(false)
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setOpen(true)
  }

  const submit = async (publish: boolean) => {
    if (!file) return
    if (!title.trim()) {
      toast.error("Gi oppslaget en tittel.")
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
      const path = `uploads/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      })
      if (upErr) {
        toast.error("Opplasting feilet: " + upErr.message)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)

      const res = await saveContent({
        title: title.trim(),
        type: "slide",
        bodyHtml: "",
        imageUrl: publicUrl,
        imageUrls: [publicUrl],
        imageMode: "plakat",
        audience: "kunde",
        targetMode: "all",
        storeIds: [],
        tagIds: [],
        validFrom: null,
        validTo: null,
        publish,
        avdeling: "felles",
      })

      if (!res.ok) {
        toast.error(res.error || "Kunne ikke lagre.")
        return
      }
      toast.success(publish ? "Tilbud publisert 🎉" : "Lagret som utkast")
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="md:hidden">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {/* Flytende kamera-knapp */}
      {!open && (
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Hurtig tilbud — ta bilde"
          className="fixed z-40 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
          style={{ backgroundColor: "var(--brand-primary, #18181b)" }}
        >
          <Camera className="w-6 h-6" />
        </button>
      )}

      {/* Capture-ark */}
      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="flex items-center justify-between px-4 h-14 border-b border-zinc-100 shrink-0">
            <button onClick={reset} aria-label="Avbryt" className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-zinc-900">Nytt hurtig-tilbud</span>
            <span className="w-8" />
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Forhåndsvisning" className="w-full max-h-72 object-contain rounded-2xl bg-zinc-50 border border-zinc-200" />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl py-2.5"
            >
              <ImageUp className="w-4 h-4" /> Ta nytt bilde
            </button>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Tittel</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Dagens tilbud — jordbær"
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
              <p className="text-xs text-zinc-400 mt-1.5">Vises på alle kundeskjermer som fullskjerm-plakat. Du kan finjustere i editoren etterpå.</p>
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2">
            <button
              onClick={() => submit(false)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-700 border border-zinc-200 rounded-xl py-3 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Lagre utkast
            </button>
            <button
              onClick={() => submit(true)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl py-3 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-primary, #18181b)" }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publiser
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
