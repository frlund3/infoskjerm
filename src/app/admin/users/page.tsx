import { getUsersWithDetails } from "@/lib/admin/queries"
import { requireRole } from "@/lib/admin/require-role"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Building2, LayoutGrid, UserCircle, Network } from "lucide-react"
import { UserDeleteButton } from "./user-delete-button"
import { UserRoleSelect } from "./user-role-select"
import { InviteUserForm } from "./invite-user-form"
import { UserStoreAccess } from "./user-store-access"
import { type UserRole, ROLE_LABELS } from "@/lib/roles"

export const dynamic = "force-dynamic"

// Roles whose access is scoped to specific stores
const STORE_SCOPED: UserRole[] = ["area_manager", "store_manager", "store_employee"]

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  super_admin: { label: ROLE_LABELS.super_admin, icon: Shield, color: "text-violet-700", bg: "bg-violet-50" },
  chain_manager: { label: ROLE_LABELS.chain_manager, icon: Building2, color: "text-blue-700", bg: "bg-blue-50" },
  area_manager: { label: ROLE_LABELS.area_manager, icon: Network, color: "text-indigo-700", bg: "bg-indigo-50" },
  store_manager: { label: ROLE_LABELS.store_manager, icon: LayoutGrid, color: "text-emerald-700", bg: "bg-emerald-50" },
  store_employee: { label: ROLE_LABELS.store_employee, icon: UserCircle, color: "text-zinc-600", bg: "bg-zinc-50" },
}

function AccessCell({
  role,
  userId,
  allStores,
  storeIds,
  unitLabelPlural,
}: {
  role: UserRole
  userId: string
  allStores: { id: string; name: string }[]
  storeIds: string[]
  unitLabelPlural: string
}) {
  if (role === "super_admin" || role === "chain_manager") {
    return <span className="text-xs text-zinc-500">Alle {unitLabelPlural.toLowerCase()}</span>
  }
  if (STORE_SCOPED.includes(role)) {
    return <UserStoreAccess userId={userId} allStores={allStores} currentStoreIds={storeIds} />
  }
  return <span className="text-xs text-zinc-400">Ingen tilgang satt</span>
}

export default async function UsersPage() {
  const { supabase, tenantId } = await requireRole(["super_admin", "chain_manager"])
  const { unitLabelPlural } = await getTenantConfig(supabase, tenantId)
  const users = await getUsersWithDetails(supabase, tenantId)
  const { data: storesData } = await supabase.from("stores").select("id, name").eq("tenant_id", tenantId).order("name")
  const allStores = (storesData ?? []) as { id: string; name: string }[]

  const rows = users.map((user) => {
    const role = (user.role ?? "store_employee") as UserRole
    const cfg = roleConfig[role] ?? roleConfig.store_employee
    const userStores = (user.user_stores as unknown as Array<{ stores: { id: string; name: string } | null }>) ?? []
    const storeIds = userStores.map((us) => us.stores?.id).filter((x): x is string => !!x)
    const displayName = user.full_name ?? user.email ?? "Ukjent"
    return { user, role, cfg, Icon: cfg.icon, displayName, storeIds }
  })

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Brukere"
        subtitle={`${users.length} brukere`}
        actions={<InviteUserForm stores={allStores} />}
      />
      <div className="flex-1 p-4 sm:p-6">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <UserCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-700">Ingen brukere ennå</p>
            <p className="text-xs text-zinc-400 mt-1">Inviter en bruker for å komme i gang.</p>
          </div>
        ) : (
          <>
            {/* Desktop: tabell */}
            <Card className="hidden lg:block">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Bruker</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Rolle</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Tilgang</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ user, role, cfg, Icon, displayName, storeIds }) => (
                      <tr key={user.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
                              <span className={`text-xs font-bold ${cfg.color}`}>{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{displayName}</p>
                              <p className="text-xs text-zinc-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <AccessCell role={role} userId={user.id} allStores={allStores} storeIds={storeIds} unitLabelPlural={unitLabelPlural} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <UserRoleSelect userId={user.id} currentRole={role} />
                            <UserDeleteButton userId={user.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Mobil + nettbrett: kort */}
            <div className="space-y-3 lg:hidden">
              {rows.map(({ user, role, cfg, Icon, displayName, storeIds }) => (
                <Card key={user.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-sm font-bold ${cfg.color}`}>{displayName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 truncate">{displayName}</p>
                        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Tilgang</p>
                      <AccessCell role={role} userId={user.id} allStores={allStores} storeIds={storeIds} unitLabelPlural={unitLabelPlural} />
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-50">
                      <div className="flex-1 min-w-0">
                        <UserRoleSelect userId={user.id} currentRole={role} />
                      </div>
                      <UserDeleteButton userId={user.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
