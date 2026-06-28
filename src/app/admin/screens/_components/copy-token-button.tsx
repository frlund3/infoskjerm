"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface CopyTokenButtonProps {
  token: string
}

export function CopyTokenButton({ token }: CopyTokenButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs text-zinc-400 font-mono truncate max-w-[140px]">{token.slice(0, 20)}…</code>
      <button
        onClick={handleCopy}
        className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors rounded"
        title="Kopier token"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}
