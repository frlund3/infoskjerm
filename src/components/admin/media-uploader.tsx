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
  const [uploads, setUploads] = useState<{ name: string; progress: number; status: "uploading" | "done" | "error"; url?: string }[]>([])

  const uploadFile = async (file: File) => {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `uploads/${crypto.randomUUID()}.${ext}`

    setUploads((prev) => [...prev, { name: file.name, progress: 0, status: "uploading" }])

    const { data, error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      setUploads((prev) => prev.map((u) => u.name === file.name ? { ...u, status: "error" } : u))
      return
    }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)

    setUploads((prev) =>
      prev.map((u) => u.name === file.name ? { ...u, progress: 100, status: "done", url: publicUrl } : u)
    )

    onUpload?.([{ id: data.id ?? path, url: publicUrl, name: file.name, size: file.size }])
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
              {dragging ? "Slipp filer her" : "Dra og slipp bilder her"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              eller <span className="text-zinc-700 underline underline-offset-2">velg fra datamaskin</span>
            </p>
            <p className="text-xs text-zinc-300 mt-2">JPG, PNG, WEBP, GIF — maks 50 MB per fil</p>
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
                  ? <img src={upload.url} alt="" className="w-9 h-9 object-cover rounded-lg" />
                  : <ImageIcon className="w-4 h-4 text-zinc-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">{upload.name}</p>
                {upload.status === "uploading" && (
                  <div className="h-1 bg-zinc-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-zinc-900 rounded-full animate-pulse w-2/3" />
                  </div>
                )}
                {upload.status === "done" && (
                  <p className="text-xs text-emerald-600 mt-0.5">Lastet opp</p>
                )}
                {upload.status === "error" && (
                  <p className="text-xs text-red-500 mt-0.5">Feil ved opplasting</p>
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
