"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/plattform", label: "Oversikt" },
  { href: "/admin/plattform/tenants", label: "Tenants" },
  { href: "/admin/plattform/brukere", label: "Brukere" },
  { href: "/admin/plattform/skjermer", label: "Skjermer" },
]

export function PlattformNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Plattform-navigasjon"
      className="mb-6 flex gap-1 border-b border-zinc-200"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin/plattform"
            ? pathname === item.href
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
