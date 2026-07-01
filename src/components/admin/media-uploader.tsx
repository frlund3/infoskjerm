"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Upload, X, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
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

export function MediaUploader({ onUpload, maxFiles = 10, accept = ["image/jpeg", "image/png", "image/webp", "image/gif"] }: MediaUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<{ name: string; progress: number; status: "uploading" | "done" | "error"; url?: string; message?: string }[]>([])

  const setUpload = (name: string, patch: Partial<{ progress: number; status: "uploading" | "done" | "error"; url?: string; message?: string }>) =>
    setUploads((prev) => prev.map((u) => (u.name === name ? { ...u, ...patch } : u)))

  // Transient storage hiccups (rate limit / connection spikes / cold service)
  // surface as 429 or 5xx. Retry a few times with backoff before giving up.
  const isTransient = (error: unknown): boolean => {
    const status = (error as { statusCode?: string | number })?.statusCode
    const code = Number(status)
    return code === 429 || (code >= 500 && code < 600)
  }

  const uploadFile = async (file: File) => {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `uploads/${crypto.randomUUID()}.${ext}`

    setUploads((prev) => [...prev, { name: file.name, progress: 0, status: "uploading" }])

    const MAX_ATTEMPTS = 4
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data, error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)
        setUpload(file.name, { progress: 100, status: "done", url: publicUrl, message: undefined })
        onUpload?.([{ id: data.id ?? path, url: publicUrl, name: file.name, size: file.size }])
        return
      }

      if (isTransient(error) && attempt < MAX_ATTEMPTS) {
        setUpload(file.name, { message: `Prøver igjen (${attempt}/${MAX_ATTEMPTS - 1})…` })
        await new Promise((r) => setTimeout(r, attempt * 1500))
        continue
      }

      setUpload(file.name, { status: "error", message: error.message || "Ukjent feil ved opplasting" })
      return
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
                    <div className="h-1 bg-zinc-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-zinc-900 rounded-full animate-pulse w-2/3" />
                    </div>
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
