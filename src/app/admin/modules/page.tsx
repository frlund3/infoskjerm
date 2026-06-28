import { Topbar } from "@/components/admin/topbar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getAllModules, getEnabledModuleKeys, groupModulesByCategory, formatModuleCategory, categoryOrder } from "@/lib/admin/modules"
import { ModuleCard } from "./_components/module-card"
import { Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ModulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const tenantId = profile?.tenant_id ?? ""
  const isAdmin = role === "super_admin" || role === "chain_manager"

  const [modules, enabledKeys] = await Promise.all([
    getAllModules(supabase),
    getEnabledModuleKeys(supabase, tenantId),
  ])

  const grouped = groupModulesByCategory(modules)
  const enabledCount = modules.filter((m) => enabledKeys.has(m.key)).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Modul-register"
        subtitle={`${enabledCount} av ${modules.length} moduler aktivert`}
      />

      <div className="flex-1 p-6">
        {modules.length === 0 && (
          <div className="text-center py-16">
            <Layers className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Ingen moduler funnet</p>
            <p className="text-sm text-zinc-400 mt-1">Kontakt super-admin for å aktivere moduler.</p>
          </div>
        )}

        <div className="space-y-8">
          {categoryOrder
            .filter((cat) => grouped[cat]?.length > 0)
            .map((category) => (
              <section key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-semibold text-zinc-900">{formatModuleCategory(category)}</h2>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {grouped[category].filter((m) => enabledKeys.has(m.key)).length}/{grouped[category].length} aktivert
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {grouped[category].map((mod) => (
                    <ModuleCard
                      key={mod.key}
                      moduleKey={mod.key}
                      name={mod.name}
                      description={mod.description}
                      isEnabled={enabledKeys.has(mod.key)}
                      tenantId={tenantId}
                      userId={user.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>

        {!isAdmin && (
          <p className="text-xs text-zinc-400 mt-8 text-center">
            Kontakt kjedeansvarlig for å aktivere eller deaktivere moduler.
          </p>
        )}
      </div>
    </div>
  )
}
