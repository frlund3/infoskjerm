import { getAdminContext } from "@/lib/admin/admin-context"
import { getCrossTenantOverview } from "@/lib/admin/cross-tenant-queries"
import { setActiveTenant } from "./actions"

function screenDotColor(online: number, total: number): string {
  if (total === 0) return "bg-zinc-300"
  if (online === 0) return "bg-red-500"
  if (online < total) return "bg-amber-500"
  return "bg-emerald-500"
}

export default async function PlattformPage() {
  const ctx = await getAdminContext()
  const overview = await getCrossTenantOverview()

  const totalTenants = overview.length
  const totalStores = overview.reduce((sum, t) => sum + t.storeCount, 0)
  const totalScreens = overview.reduce((sum, t) => sum + t.screenTotal, 0)
  const totalScreensOnline = overview.reduce((sum, t) => sum + t.screenOnline, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Oversikt</h1>
      <p className="text-zinc-500 mb-6">Alle kunde-organisasjoner på plattformen.</p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
          <p className="text-xs text-zinc-400">Tenants</p>
          <p className="text-2xl font-bold text-zinc-900">{totalTenants}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
          <p className="text-xs text-zinc-400">Butikker</p>
          <p className="text-2xl font-bold text-zinc-900">{totalStores}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
          <p className="text-xs text-zinc-400">Skjermer online</p>
          <p className="text-2xl font-bold text-zinc-900">
            {totalScreensOnline}
            <span className="text-base font-medium text-zinc-400">/{totalScreens}</span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium text-right">Butikker</th>
              <th className="px-4 py-3 font-medium text-right">Skjermer</th>
              <th className="px-4 py-3 font-medium text-right">Brukere</th>
              <th className="px-4 py-3 font-medium text-right">Innhold</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {overview.map((t) => {
              const isActive = ctx?.activeTenant?.id === t.id
              return (
                <tr key={t.id} className="border-b border-zinc-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-900">{t.name}</p>
                    <p className="text-xs text-zinc-400">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.storeCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${screenDotColor(
                          t.screenOnline,
                          t.screenTotal
                        )}`}
                        aria-hidden
                      />
                      {t.screenOnline}/{t.screenTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.userCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.contentLive}/{t.contentTotal}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={setActiveTenant.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                        disabled={isActive}
                      >
                        {isActive ? "Aktiv" : "Opptre som"}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
