"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config"
import { Upload, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string
  url: string
  name: string
  size: number
}

interface MediaUploaderProps {
  onUpload?: (files: UploadedFile[]) => void
  maxFiles?: number
  accept?: string[]
}

// Supabase-bucketens grense (og prosjektets globale storage-grense). Filer over
// dette avvises av serveren — vi fanger det FØR opplasting for umiddelbar beskjed.
const MAX_SIZE = 50 * 1024 * 1024

const EXT_MIME: Record<string, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/x-m4v",
}

/** En fil vi kan validere/laste opp — Files matcher denne, men vi tar bare det
 * vi trenger så logikken er enhetstestbar uten en ekte File. */
export interface UploadCandidate {
  name: string
  size: number
  type: string
}

/** Content-Type for en fil: nettleserens type, ellers utledet fra filendelsen
 * (noen OS gir tom/feil type for .pptx, som da ville blitt avvist av Storage). */
export function contentTypeFor(file: UploadCandidate): string {
  const ext = file.name.toLowerCase().split(".").pop() ?? ""
  return file.type || EXT_MIME[ext] || "application/octet-stream"
}

function isPptName(name: string): boolean {
  const n = name.toLowerCase()
  return n.endsWith(".pptx") || n.endsWith(".ppt")
}

/** Validér fila FØR opplasting — gir umiddelbar beskjed i stedet for at en for
 * stor / feil fil overføres i minutter og deretter avvises av serveren.
 * Returnerer en feilmelding, eller null når fila er OK. */
export function checkFile(file: UploadCandidate, accept: string[]): string | null {
  if (file.size > MAX_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return isPptName(file.name)
      ? `Presentasjonen er ${mb} MB — maks 50 MB. Komprimer den i PowerPoint (Fil → Komprimer bilder) eller del den i to.`
      : `Filen er ${mb} MB — maks 50 MB. Komprimer eller velg en mindre fil.`
  }
  if (accept.length > 0 && !accept.includes(contentTypeFor(file))) {
    return "Filtypen støttes ikke her."
  }
  return null
}

export function MediaUploader({ onUpload, maxFiles = 10, accept = ["image/jpeg", "image/png", "image/webp", "image/gif"] }: MediaUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<{ name: string; progress: number; status: "uploading" | "done" | "error"; url?: string; message?: string }[]>([])

  const setUpload = (name: string, patch: Partial<{ progress: number; status: "uploading" | "done" | "error"; url?: string; message?: string }>) =>
    setUploads((prev) => prev.map((u) => (u.name === name ? { ...u, ...patch } : u)))

  // Transient storage hiccups (rate limit / connection spikes / cold service)
  // surface as 429 or 5xx. Retry a few times with backoff before giving up.
  const isTransient = (error: unknown): boolean => {
    const code = Number((error as { statusCode?: string | number })?.statusCode)
    return code === 429 || (code >= 500 && code < 600)
  }

  /** XHR-opplasting mot Storage med EKTE fremdrift (supabase-js .upload() gir
   * ingen progress-event). Content-Type settes eksplisitt så Storage godtar
   * .pptx også når nettleseren ikke satte MIME. */
  const putToStorage = (file: File, path: string, token: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/media/${path}`)
      xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.setRequestHeader("x-upsert", "false")
      xhr.setRequestHeader("Content-Type", contentTypeFor(file))
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUpload(file.name, { progress: Math.round((e.loaded / e.total) * 100), message: undefined })
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve()
        let message = `Opplasting feilet (${xhr.status})`
        try { message = JSON.parse(xhr.responseText).message || message } catch { /* behold status-melding */ }
        reject({ statusCode: xhr.status, message })
      }
      xhr.onerror = () => reject({ statusCode: 0, message: "Nettverksfeil under opplasting" })
      xhr.send(file)
    })

  const uploadFile = async (file: File) => {
    const validationError = checkFile(file, accept)
    if (validationError) {
      setUploads((prev) => [...prev, { name: file.name, progress: 0, status: "error", message: validationError }])
      return
    }

    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `uploads/${crypto.randomUUID()}.${ext}`
    setUploads((prev) => [...prev, { name: file.name, progress: 0, status: "uploading" }])

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? SUPABASE_ANON_KEY

    const MAX_ATTEMPTS = 4
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await putToStorage(file, path, token)
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)
        setUpload(file.name, { progress: 100, status: "done", url: publicUrl, message: undefined })
        onUpload?.([{ id: path, url: publicUrl, name: file.name, size: file.size }])
        return
      } catch (err) {
        if (isTransient(err) && attempt < MAX_ATTEMPTS) {
          setUpload(file.name, { progress: 0, message: `Prøver igjen (${attempt}/${MAX_ATTEMPTS - 1})…` })
          await new Promise((r) => setTimeout(r, attempt * 1500))
          continue
        }
        setUpload(file.name, { status: "error", message: (err as { message?: string })?.message || "Ukjent feil ved opplasting" })
        return
      }
    }
  }

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, maxFiles)
    arr.forEach(uploadFile)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
  }

  const hasVideo = accept.some((a) => a.startsWith("video/"))
  const hasPdf = accept.includes("application/pdf")
  const hasPpt = accept.some((a) => a.includes("presentationml") || a.includes("ms-powerpoint"))
  const formatHint = [
    accept.some((a) => a.startsWith("image/")) ? "JPG, PNG, WEBP, GIF" : null,
    hasPdf ? "PDF" : null,
    hasPpt ? "PowerPoint" : null,
    hasVideo ? "MP4/WEBM/MOV-video" : null,
  ].filter(Boolean).join(" · ") + " — maks 50 MB per fil"
  const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)$/.test(u.toLowerCase().split("?")[0])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
          dragging
            ? "border-zinc-900 bg-zinc-50 scale-[1.01]"
            : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" className="hidden" multiple accept={accept.join(",")} onChange={onInputChange} />
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
            dragging ? "bg-zinc-900" : "bg-zinc-100"
          )}>
            <Upload className={cn("w-6 h-6 transition-all", dragging ? "text-white" : "text-zinc-500")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700">
              {dragging ? "Slipp filer her" : hasVideo ? "Dra og slipp bilde eller video her" : "Dra og slipp bilder her"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              eller <span className="text-zinc-700 underline underline-offset-2">velg fra datamaskin</span>
            </p>
            <p className="text-xs text-zinc-300 mt-2">{formatHint}</p>
          </div>
        </div>
      </label>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                {upload.status === "done" && upload.url
                  ? (isVideoUrl(upload.url)
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      ? <video src={upload.url} muted className="w-9 h-9 object-cover rounded-lg" />
                      : <img src={upload.url} alt="" className="w-9 h-9 object-cover rounded-lg" />)
                  : <ImageIcon className="w-4 h-4 text-zinc-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">{upload.name}</p>
                {upload.status === "uploading" && (
                  <>
                    <div className="h-1.5 bg-zinc-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-zinc-900 rounded-full transition-[width] duration-200 ease-out" style={{ width: `${Math.max(3, upload.progress)}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 tabular-nums">
                      {upload.progress >= 100 ? "Fullfører …" : `${upload.progress} %`}
                    </p>
                    {upload.message && <p className="text-xs text-amber-600 mt-1">{upload.message}</p>}
                  </>
                )}
                {upload.status === "done" && (
                  <p className="text-xs text-emerald-600 mt-0.5">Lastet opp</p>
                )}
                {upload.status === "error" && (
                  <p className="text-xs text-red-500 mt-0.5">{upload.message || "Feil ved opplasting"}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {upload.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {upload.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                {upload.status === "uploading" && (
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
