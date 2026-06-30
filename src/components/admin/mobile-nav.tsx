"use client"

import { useState } from "react"
import { Menu, X, Monitor } from "lucide-react"
import { Sidebar } from "./sidebar"

interface MobileNavProps {
  user: {
    email: string
    fullName: string
    role: string
    chainName: string | null
    chainColor: string | null
  }
}

/**
 * Mobile navigation: a top app bar with a hamburger that opens the full sidebar
 * as a slide-in drawer. The desktop sidebar is hidden below md, so this is the
 * only way to navigate on phones. Tapping a link (or the backdrop) closes it.
 */
export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-white border-b border-zinc-100 px-4 h-14">
        <button onClick={() => setOpen(true)} aria-label="Åpne meny" className="p-1.5 -ml-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Monitor className="w-4 h-4" style={{ color: "var(--brand-fg)" }} />
          </span>
          <span className="font-bold text-sm text-zinc-900 truncate">{user.chainName ?? "Infoskjerm"}</span>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          {/* Clicking a nav link bubbles up here and closes the drawer. */}
          <div onClick={() => setOpen(false)}>
            <Sidebar user={user} />
          </div>
          <button onClick={() => setOpen(false)} aria-label="Lukk meny" className="absolute top-3 left-[15.5rem] z-10 p-1.5 rounded-lg bg-white shadow text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
