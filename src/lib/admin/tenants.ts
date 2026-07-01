import { createAdminClient } from "@/lib/supabase/server"

export interface TenantRow {
  id: string
  name: string
  slug: string
  created_at: string
}

/** Alle tenants på tvers (service-role). Kun for verifiserte super_admin-stier. */
export async function listAllTenants(): Promise<TenantRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, created_at")
    .order("name")
  if (error) throw error
  return (data ?? []).map((tenant) => ({
    ...tenant,
    created_at: tenant.created_at ?? "",
  }))
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tenants")
    .select("id, name, slug, created_at")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  return { ...data, created_at: data.created_at ?? "" }
}
