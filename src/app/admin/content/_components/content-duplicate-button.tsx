"use client"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { duplicateContentItem } from "../actions"
import { useState } from "react"
import { toast } from "sonner"

export function ContentDuplicateButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    const result = await duplicateContentItem(itemId)
    setLoading(false)
    if (result.ok) toast.success("Innhold duplisert som utkast")
    else toast.error(result.error ?? "Feil ved duplisering")
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDuplicate} disabled={loading} title="Dupliser">
      <Copy className={`w-4 h-4 ${loading ? "opacity-50" : "text-zinc-400"}`} />
    </Button>
  )
}
