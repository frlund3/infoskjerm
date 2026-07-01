import { getCrossTenantUsers } from "@/lib/admin/cross-tenant-queries"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}

export default async function PlattformBrukerePage() {
  const users = await getCrossTenantUsers()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Brukere</h1>
      <p className="text-zinc-500 mb-6">
        Alle brukere på tvers av tenants ({users.length}).
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Navn / E-post</th>
              <th className="px-4 py-3 font-medium">Rolle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-50 last:border-b-0">
                <td className="px-4 py-3 text-zinc-700">{u.tenantName}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{u.fullName || "—"}</p>
                  <p className="text-xs text-zinc-400">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-700">{roleLabel(u.role)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
