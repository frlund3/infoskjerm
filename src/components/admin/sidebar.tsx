"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Store,
  Monitor,
  Newspaper,
  Trophy,
  BarChart3,
  CloudSun,
  Images,
  ListVideo,
  Send,
  Users,
  Settings,
  Tag,
  ChevronRight,
} from "lucide-react"

const navGroups = [
  {
    label: "Oversikt",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Organisasjon",
    items: [
      { href: "/admin/stores", label: "Butikker", icon: Store },
      { href: "/admin/screens", label: "Skjermer", icon: Monitor },
      { href: "/admin/tags", label: "Tags", icon: Tag },
    ],
  },
  {
    label: "Innhold",
    items: [
      { href: "/admin/content/news", label: "Nyheter", icon: Newspaper },
      { href: "/admin/content/competitions", label: "Konkurranser", icon: Trophy },
      { href: "/admin/content/stats", label: "Salgstall", icon: BarChart3 },
      { href: "/admin/content/weather", label: "Vær", icon: CloudSun },
      { href: "/admin/content/slides", label: "Slides", icon: Images },
    ],
  },
  {
    label: "Distribusjon",
    items: [
      { href: "/admin/playlists", label: "Spillelister", icon: ListVideo },
      { href: "/admin/publish", label: "Publiser", icon: Send },
    ],
  },
  {
    label: "Administrasjon",
    items: [
      { href: "/admin/users", label: "Brukere", icon: Users },
      { href: "/admin/settings", label: "Innstillinger", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Gange-Rolv</p>
          <p className="text-zinc-500 text-xs">Infoskjerm</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                        active
                          ? "bg-zinc-800 text-white font-medium"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-emerald-400" : "group-hover:text-zinc-200")} />
                      {item.label}
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-zinc-600" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Admin</p>
            <p className="text-zinc-500 text-xs truncate">super_admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
