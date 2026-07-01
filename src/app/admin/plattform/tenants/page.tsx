import { requireSuperAdmin } from "@/lib/admin/require-role"
import { listAllTenants, type TenantRow } from "@/lib/admin/tenants"
import {
  createTenant,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  archiveTenant,
} from "./actions"

export const dynamic = "force-dynamic"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Aktiv", className: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspendert", className: "bg-amber-100 text-amber-700" },
  archived: { label: "Arkivert", className: "bg-zinc-200 text-zinc-600" },
}

// Form-action-wrappere: skjema-actions må returnere void. Vi kaster bort
// resultatet her (feil logges/vises ikke i denne minimale visningen).
async function createTenantAction(formData: FormData): Promise<void> {
  "use server"
  await createTenant({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    adminEmail: String(formData.get("adminEmail") ?? ""),
  })
}

async function updateTenantAction(id: string, formData: FormData): Promise<void> {
  "use server"
  await updateTenant(id, String(formData.get("name") ?? ""))
}

async function suspendTenantAction(id: string): Promise<void> {
  "use server"
  await suspendTenant(id)
}

async function reactivateTenantAction(id: string): Promise<void> {
  "use server"
  await reactivateTenant(id)
}

async function archiveTenantAction(id: string): Promise<void> {
  "use server"
  await archiveTenant(id)
}

export default async function TenantsPage() {
  await requireSuperAdmin()
  const tenants = await listAllTenants()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Tenants</h1>
      <p className="text-zinc-500 mb-6">
        Opprett, rediger og styr livssyklusen til kunde-organisasjoner.
      </p>

      {/* Ny tenant */}
      <form
        action={createTenantAction}
        className="mb-8 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Ny tenant</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Navn</span>
            <input
              name="name"
              type="text"
              required
              placeholder="Gange-Rolv AS"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Slug</span>
            <input
              name="slug"
              type="text"
              required
              pattern="[a-z0-9-]+"
              placeholder="gange-rolv"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Admin-e-post</span>
            <input
              name="adminEmail"
              type="email"
              required
              placeholder="admin@kunde.no"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Opprett tenant + inviter admin
        </button>
      </form>

      {/* Liste */}
      <ul className="space-y-3">
        {tenants.map((t) => (
          <TenantCard key={t.id} tenant={t} />
        ))}
      </ul>
    </div>
  )
}

function TenantCard({ tenant }: { tenant: TenantRow }) {
  const badge = STATUS_BADGE[tenant.status] ?? STATUS_BADGE.active

  return (
    <li className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-zinc-900">{tenant.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="truncate text-xs text-zinc-400">{tenant.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tenant.status !== "archived" && (
            <form action={updateTenantAction.bind(null, tenant.id)} className="flex items-center gap-1">
              <input
                name="name"
                type="text"
                defaultValue={tenant.name}
                className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Lagre
              </button>
            </form>
          )}

          {tenant.status === "active" && (
            <form action={suspendTenantAction.bind(null, tenant.id)}>
              <button
                type="submit"
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                Suspender
              </button>
            </form>
          )}

          {tenant.status !== "active" && (
            <form action={reactivateTenantAction.bind(null, tenant.id)}>
              <button
                type="submit"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Reaktiver
              </button>
            </form>
          )}

          {tenant.status !== "archived" && (
            <form action={archiveTenantAction.bind(null, tenant.id)}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
              >
                Arkiver
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  )
}
