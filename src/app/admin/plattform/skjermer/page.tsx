import { getCrossTenantScreens } from "@/lib/admin/cross-tenant-queries"
import { formatLastSeen } from "@/lib/admin/queries"

const DOT_COLOR: Record<"green" | "yellow" | "red", string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
}

export default async function PlattformSkjermerPage() {
  const screens = await getCrossTenantScreens()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Skjermer</h1>
      <p className="text-zinc-500 mb-6">
        Drift på tvers av alle tenants ({screens.length}).
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Butikk</th>
              <th className="px-4 py-3 font-medium">Skjerm</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sist sett</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((s) => (
              <tr key={s.id} className="border-b border-zinc-50 last:border-b-0">
                <td className="px-4 py-3 text-zinc-700">{s.tenantName}</td>
                <td className="px-4 py-3 text-zinc-700">{s.storeName}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_COLOR[s.color]}`}
                    aria-label={s.color}
                  />
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {formatLastSeen(s.lastHeartbeat)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
