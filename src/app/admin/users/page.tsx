import { createClient } from "@/lib/supabase/server"
import { getUsersWithDetails } from "@/lib/admin/queries"
import { requireRole } from "@/lib/admin/require-role"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Building2, Store, UserCircle, Info } from "lucide-react"
import { UserDeleteButton } from "./user-delete-button"
import { UserRoleSelect } from "./user-role-select"

export const dynamic = "force-dynamic"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, color: "text-violet-700", bg: "bg-violet-50" },
  chain_manager: { label: "Kjedeleder", icon: Building2, color: "text-blue-700", bg: "bg-blue-50" },
  store_manager: { label: "Butikksjef", icon: Store, color: "text-emerald-700", bg: "bg-emerald-50" },
  store_employee: { label: "Ansatt", icon: UserCircle, color: "text-zinc-600", bg: "bg-zinc-50" },
}

export default async function UsersPage() {
  await requireRole(["super_admin", "chain_manager"])
  const supabase = await createClient()
  const users = await getUsersWithDetails(supabase)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Brukere"
        subtitle={`${users.length} brukere — 4 roller`}
        actions={
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-700">Nye brukere opprettes via Supabase Dashboard</span>
          </div>
        }
      />
      <div className="flex-1 p-6">
        {users.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen brukere funnet.</p>
          </div>
        ) : (
          <Card>
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
                  {users.map((user) => {
                    const role = (user.role ?? "store_employee") as UserRole
                    const cfg = roleConfig[role] ?? roleConfig.store_employee
                    const Icon = cfg.icon
                    const chain = (user.chains as unknown as { name: string; color: string } | null)
                    const userStores = (user.user_stores as unknown as Array<{ stores: { id: string; name: string } | null }>) ?? []
                    const displayName = user.full_name ?? user.email ?? "Ukjent"

                    return (
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
                          <div className="flex flex-wrap gap-1">
                            {chain ? (
                              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{chain.name}</span>
                            ) : userStores.length > 0 ? (
                              userStores.slice(0, 3).map((us) => us.stores ? (
                                <span key={us.stores.id} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{us.stores.name}</span>
                              ) : null)
                            ) : (
                              <span className="text-xs text-zinc-400">Ingen tilgang satt</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <UserRoleSelect userId={user.id} currentRole={role} />
                            <UserDeleteButton userId={user.id} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
