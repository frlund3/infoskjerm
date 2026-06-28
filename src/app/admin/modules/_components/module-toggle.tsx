"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toggleTenantModule } from "@/lib/admin/modules"

interface ModuleToggleProps {
  moduleKey: string
  tenantId: string
  userId: string
  initialEnabled: boolean
}

export function ModuleToggle({ moduleKey, tenantId, userId, initialEnabled }: ModuleToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const supabase = createClient()
    await toggleTenantModule(supabase, tenantId, moduleKey, userId, !enabled)
    setEnabled((prev) => !prev)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
      style={enabled ? { backgroundColor: "var(--brand-primary)" } : { backgroundColor: "#d4d4d8" }}
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? "Deaktiver" : "Aktiver"} modul`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}
