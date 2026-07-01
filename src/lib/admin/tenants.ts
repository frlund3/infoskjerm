import { createAdminClient } from "@/lib/supabase/server"

export interface TenantRow {
  id: string
  name: string
  slug: string
  created_at: string
  status: string
  archivedAt: string | null
}

// Kolonnene status/archived_at (036) er ikke i den genererte Database-typen ennå
// → cast slik config.ts gjør for tenants-utvidelser.
type TenantSelectRow = {
  id: string
  name: string
  slug: string
  created_at: string | null
  status: string | null
  archived_at: string | null
}

function mapTenant(row: TenantSelectRow): TenantRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    created_at: row.created_at ?? "",
    status: row.status ?? "active",
    archivedAt: row.archived_at ?? null,
  }
}

/** Alle tenants på tvers (service-role). Kun for verifiserte super_admin-stier. */
export async function listAllTenants(): Promise<TenantRow[]> {
  const admin = createAdminClient()
  const { data, error } = await (admin.from("tenants") as unknown as {
    select: (cols: string) => {
      order: (col: string) => Promise<{ data: TenantSelectRow[] | null; error: unknown }>
    }
  })
    .select("id, name, slug, created_at, status, archived_at")
    .order("name")
  if (error) throw error
  return (data ?? []).map(mapTenant)
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const admin = createAdminClient()
  const { data } = await (admin.from("tenants") as unknown as {
    select: (cols: string) => {
      eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: TenantSelectRow | null }> }
    }
  })
    .select("id, name, slug, created_at, status, archived_at")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  return mapTenant(data)
}
