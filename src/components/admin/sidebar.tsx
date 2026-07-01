"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Store, Monitor, Tv, Users, Settings, ChevronRight, LogOut, Newspaper, Megaphone, ScrollText, Ticket, QrCode,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { useTenantConfig } from "./tenant-config-provider"
import { TenantSwitcher, type SwitcherTenant } from "@/components/admin/tenant-switcher"

type UserRole = "super_admin" | "chain_manager" | "area_manager" | "store_manager" | "store_employee"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  matchPrefix?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const ALL_AUTHORS: UserRole[] = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"]

const navGroups: NavGroup[] = [
  {
    label: "Innhold",
    items: [
      { href: "/admin/kundeinnhold", label: "Kundeskjerm", icon: Megaphone, roles: ALL_AUTHORS, matchPrefix: true },
      { href: "/admin/innhold", label: "Internt", icon: Newspaper, roles: ALL_AUTHORS, matchPrefix: true },
    ],
  },
  {
    label: "Kampanjer",
    items: [
      { href: "/admin/invitasjoner", label: "Invitasjoner", icon: Ticket, roles: ALL_AUTHORS, matchPrefix: true },
      { href: "/admin/kundeklubb", label: "Kundeklubb", icon: QrCode, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Oversikt",
    items: [
      { href: "/admin/cms", label: "Forhåndsvisning", icon: Monitor, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Butikker",
    items: [
      { href: "/admin/stores", label: "Butikker", icon: Store, roles: ["super_admin", "chain_manager", "area_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/skjermer", label: "Skjermer", icon: Tv, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
      { href: "/admin/users", label: "Brukere", icon: Users, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"] },
      { href: "/admin/logg", label: "Logg", icon: ScrollText, roles: ["super_admin", "chain_manager"], matchPrefix: true },
      { href: "/admin/settings", label: "Innstillinger", icon: Settings, roles: ["super_admin", "chain_manager"] },
    ],
  },
]

interface SidebarProps {
  user: {
    email: string
    fullName: string
    role: string
    chainName: string | null
    orgName: string | null
    chainColor: string | null
    chainLogoUrl: string | null
    isImpersonating: boolean
    activeTenantName: string | null
    tenants: SwitcherTenant[]
    activeTenantId: string | null
  }
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  chain_manager: "Tenant Admin",
  area_manager: "Flerenhetsadmin",
  store_manager: "Enhetsadmin",
  store_employee: "Redaktør",
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user.role as UserRole
  const { unitLabelPlural } = useTenantConfig()
  // Bytt «Butikker» → tenantens substantiv (f.eks. «Forhandlere»).
  const relabel = (s: string) => (s === "Butikker" ? unitLabelPlural : s)
  const groups = navGroups.map((g) => ({
    ...g,
    label: relabel(g.label),
    items: g.items.map((i) => ({ ...i, label: relabel(i.label) })),
  }))

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-zinc-100 flex flex-col z-40">
      {/* Logo/brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <div
          className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={user.chainLogoUrl ? { backgroundColor: "white" } : { backgroundColor: "var(--brand-primary)" }}
        >
          {user.chainLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.chainLogoUrl} alt={user.chainName ?? "Logo"} className="w-full h-full object-contain" />
          ) : (
            <span className="text-sm font-bold" style={{ color: "var(--brand-fg)" }}>
              {(user.chainName ?? "Infoskjerm").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-zinc-900 font-bold text-sm leading-tight truncate">
            {user.orgName ?? "Infoskjerm"}
          </p>
          <p className="text-zinc-400 text-xs">Administrasjon</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {role === "super_admin" && (
          <TenantSwitcher tenants={user.tenants} activeTenantId={user.activeTenantId} />
        )}
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="mb-4">
              <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = item.matchPrefix
                    ? (pathname === item.href || pathname.startsWith(item.href + "/"))
                    : pathname === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          active
                            ? "font-semibold text-white"
                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                        )}
                        style={active ? { backgroundColor: "var(--brand-primary)" } : undefined}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {user.isImpersonating && user.activeTenantName && (
        <ImpersonationBanner tenantName={user.activeTenantName} />
      )}

      {/* User footer */}
      <div className="px-3 py-3 border-t border-zinc-100">
        <div className="flex items-center gap-3 px-2">
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
            className="text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-zinc-50"
            title="Logg ut"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
