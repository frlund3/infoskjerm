"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Store, Monitor, Newspaper, Trophy,
  BarChart3, CloudSun, Images, ListVideo, Send, Users,
  Settings, Tag, ChevronRight, LogOut, Layers, PenSquare,
  Layout, UserPlus, CalendarDays,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Oversikt",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "chain_manager", "store_manager", "store_employee"] },
    ],
  },
  {
    label: "Organisasjon",
    items: [
      { href: "/admin/stores", label: "Butikker", icon: Store, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/screens", label: "Skjermer", icon: Monitor, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/tags", label: "Tags", icon: Tag, roles: ["super_admin", "chain_manager"] },
    ],
  },
  {
    label: "Innhold",
    items: [
      { href: "/admin/modules", label: "Moduler", icon: Layers, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/builder", label: "Bygg innhold", icon: PenSquare, roles: ["super_admin", "chain_manager", "store_manager"] as UserRole[] },
      { href: "/admin/content/news", label: "Nyheter", icon: Newspaper, roles: ["super_admin", "chain_manager", "store_manager", "store_employee"] },
      { href: "/admin/content/competitions", label: "Konkurranser", icon: Trophy, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/content/stats", label: "Salgstall", icon: BarChart3, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/content/weather", label: "Vær", icon: CloudSun, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/content/slides", label: "Slides", icon: Images, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/content/calendar", label: "Kalender", icon: CalendarDays, roles: ["super_admin", "chain_manager", "store_manager"] as UserRole[] },
    ],
  },
  {
    label: "Distribusjon",
    items: [
      { href: "/admin/playlists", label: "Spillelister", icon: ListVideo, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/publish", label: "Publiser", icon: Send, roles: ["super_admin", "chain_manager", "store_manager"] },
    ],
  },
  {
    label: "Administrasjon",
    items: [
      { href: "/admin/users", label: "Brukere", icon: Users, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/zones", label: "Sone-oppsett", icon: Layout, roles: ["super_admin", "chain_manager"] as UserRole[] },
      { href: "/admin/onboarding", label: "Ny tenant", icon: UserPlus, roles: ["super_admin"] as UserRole[] },
      { href: "/admin/settings", label: "Innstillinger", icon: Settings, roles: ["super_admin", "chain_manager", "store_manager"] },
    ],
  },
]

interface SidebarProps {
  user: {
    email: string
    fullName: string
    role: string
    chainName: string | null
    chainColor: string | null
  }
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  chain_manager: "Kjedeleder",
  store_manager: "Butikksjef",
  store_employee: "Ansatt",
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user.role as UserRole

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-zinc-200 flex flex-col z-40 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          <Layers className="w-4 h-4" style={{ color: "var(--brand-fg)" }} />
        </div>
        <div>
          <p className="text-zinc-900 font-bold text-sm leading-tight">
            {user.chainName ?? "Infoskjerm"}
          </p>
          <p className="text-zinc-400 text-xs">Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="mb-5">
              <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          active
                            ? "font-medium text-white"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                        )}
                        style={active ? { backgroundColor: "var(--brand-primary)" } : undefined}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-900 text-xs font-medium truncate">{user.fullName}</p>
            <p className="text-zinc-400 text-xs truncate">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 p-2.5 -m-2.5 rounded-lg hover:bg-zinc-50"
            title="Logg ut"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
