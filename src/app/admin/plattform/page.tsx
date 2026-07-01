import { listAllTenants } from "@/lib/admin/tenants"
import { getAdminContext } from "@/lib/admin/admin-context"
import { setActiveTenant } from "./actions"

export default async function PlattformPage() {
  const ctx = await getAdminContext()
  const tenants = await listAllTenants()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Plattform</h1>
      <p className="text-zinc-500 mb-6">Velg en kunde-organisasjon å opptre som.</p>
      <ul className="space-y-2">
        {tenants.map((t) => {
          const isActive = ctx?.activeTenant?.id === t.id
          return (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{t.name}</p>
                <p className="text-xs text-zinc-400 truncate">{t.slug}</p>
              </div>
              <form action={setActiveTenant.bind(null, t.id)}>
                <button
                  type="submit"
                  className="text-sm font-medium rounded-lg px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
                  disabled={isActive}
                >
                  {isActive ? "Aktiv" : "Opptre som"}
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
