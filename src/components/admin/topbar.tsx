"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="h-16 border-b border-zinc-100 bg-white flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-zinc-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  )
}
