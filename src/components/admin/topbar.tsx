import { Bell, ChevronLeft } from "lucide-react"
import Link from "next/link"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  backHref?: string
}

export function Topbar({ title, subtitle, actions, backHref }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
      <div className="h-0.5 w-full" style={{ backgroundColor: "var(--brand-primary)" }} />

      <div className="flex items-center px-6 gap-4 py-3 min-h-[60px]">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mr-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Tilbake
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <button className="relative p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand-primary)" }} />
          </button>
        </div>
      </div>
    </header>
  )
}
