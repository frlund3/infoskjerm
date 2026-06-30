import { ChevronLeft } from "lucide-react"
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

      <div className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:min-h-[60px]">
        <div className="flex items-center gap-1 min-w-0 sm:flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mr-1 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbake
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-zinc-900 leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
