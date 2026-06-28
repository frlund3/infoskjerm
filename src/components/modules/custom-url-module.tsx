import { Globe } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function CustomUrlModule({ fields }: Props) {
  const url = (fields.url as string) || ''
  const zoom = Number(fields.zoom) || 100
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-zinc-500">
        <Globe className="w-16 h-16 mb-4" />
        <p className="text-xl">Ingen URL angitt</p>
      </div>
    )
  }
  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        src={url}
        className="w-full h-full border-0 origin-top-left"
        style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  )
}
