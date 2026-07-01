import { createAdminClient } from "@/lib/supabase/server"
import { getScreenStatusColor } from "@/lib/admin/queries"

/**
 * Kryss-tenant-lesninger via service-role. Denne fila skal KUN importeres av
 * super_admin-guardede plattform-sider — den bruker service-role og filtrerer
 * bevisst ikke på tenant. Ikke bruk fra kunde-scopede stier.
 */

export interface CrossTenantOverviewRow {
  id: string
  name: string
  slug: string
  storeCount: number
  screenTotal: number
  screenOnline: number
  userCount: number
  contentTotal: number
  contentLive: number
}

export interface CrossTenantUser {
  id: string
  email: string
  fullName: string
  role: string
  tenantId: string
  tenantName: string
}

export interface CrossTenantScreen {
  id: string
  name: string
  status: string | null
  lastHeartbeat: string | null
  storeName: string
  tenantName: string
  color: "green" | "yellow" | "red"
}

const UNKNOWN_TENANT = "Ukjent"
const UNKNOWN_STORE = "—"

/**
 * Én rad per tenant med aggregerte tellinger på tvers av alle tenants.
 * Henter alle rader flatt og aggregerer i JS gruppert på tenant_id (unngår
 * N spørringer per tenant).
 */
export async function getCrossTenantOverview(): Promise<CrossTenantOverviewRow[]> {
  const admin = createAdminClient()

  const [tenantsResult, storesResult, screensResult, usersResult, contentResult] =
    await Promise.all([
      admin.from("tenants").select("id, name, slug"),
      admin.from("stores").select("id, tenant_id"),
      admin.from("screens").select("id, tenant_id, status, last_heartbeat"),
      admin.from("users").select("id, tenant_id"),
      admin.from("content_items").select("id, tenant_id, status"),
    ])

  const tenants = tenantsResult.data ?? []
  const stores = storesResult.data ?? []
  const screens = screensResult.data ?? []
  const users = usersResult.data ?? []
  const content = contentResult.data ?? []

  const rows = new Map<string, CrossTenantOverviewRow>()
  for (const tenant of tenants) {
    rows.set(tenant.id, {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      storeCount: 0,
      screenTotal: 0,
      screenOnline: 0,
      userCount: 0,
      contentTotal: 0,
      contentLive: 0,
    })
  }

  for (const store of stores) {
    const row = rows.get(store.tenant_id)
    if (row) row.storeCount += 1
  }

  for (const screen of screens) {
    const row = rows.get(screen.tenant_id)
    if (!row) continue
    row.screenTotal += 1
    if (getScreenStatusColor(screen.status, screen.last_heartbeat) !== "red") {
      row.screenOnline += 1
    }
  }

  for (const user of users) {
    const row = rows.get(user.tenant_id)
    if (row) row.userCount += 1
  }

  for (const item of content) {
    const row = rows.get(item.tenant_id)
    if (!row) continue
    row.contentTotal += 1
    if (item.status === "live") row.contentLive += 1
  }

  return Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, "nb"))
}

/** Alle brukere på tvers av tenants, med tenant-navn påhengt. */
export async function getCrossTenantUsers(): Promise<CrossTenantUser[]> {
  const admin = createAdminClient()

  const [usersResult, tenantsResult] = await Promise.all([
    admin.from("users").select("id, email, full_name, role, tenant_id"),
    admin.from("tenants").select("id, name"),
  ])

  const tenantNames = new Map<string, string>()
  for (const tenant of tenantsResult.data ?? []) {
    tenantNames.set(tenant.id, tenant.name)
  }

  const users: CrossTenantUser[] = (usersResult.data ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    tenantId: user.tenant_id,
    tenantName: tenantNames.get(user.tenant_id) ?? UNKNOWN_TENANT,
  }))

  return users.sort(
    (a, b) =>
      a.tenantName.localeCompare(b.tenantName, "nb") || a.email.localeCompare(b.email, "nb")
  )
}

/** Alle skjermer på tvers av tenants, med butikk- og tenant-navn + statusfarge. */
export async function getCrossTenantScreens(): Promise<CrossTenantScreen[]> {
  const admin = createAdminClient()

  const [screensResult, storesResult, tenantsResult] = await Promise.all([
    admin.from("screens").select("id, name, status, last_heartbeat, store_id, tenant_id"),
    admin.from("stores").select("id, name"),
    admin.from("tenants").select("id, name"),
  ])

  const storeNames = new Map<string, string>()
  for (const store of storesResult.data ?? []) {
    storeNames.set(store.id, store.name)
  }

  const tenantNames = new Map<string, string>()
  for (const tenant of tenantsResult.data ?? []) {
    tenantNames.set(tenant.id, tenant.name)
  }

  const screens: CrossTenantScreen[] = (screensResult.data ?? []).map((screen) => ({
    id: screen.id,
    name: screen.name,
    status: screen.status,
    lastHeartbeat: screen.last_heartbeat,
    storeName: storeNames.get(screen.store_id) ?? UNKNOWN_STORE,
    tenantName: tenantNames.get(screen.tenant_id) ?? UNKNOWN_TENANT,
    color: getScreenStatusColor(screen.status, screen.last_heartbeat),
  }))

  return screens.sort(
    (a, b) =>
      a.tenantName.localeCompare(b.tenantName, "nb") ||
      a.storeName.localeCompare(b.storeName, "nb")
  )
}
