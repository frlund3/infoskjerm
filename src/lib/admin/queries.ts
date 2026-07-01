import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdminSupabase = SupabaseClient<Database>

export function formatLastSeen(timestamp: string | null): string {
  if (!timestamp) return 'Aldri'
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Akkurat nå'
  if (minutes < 60) return `${minutes} min siden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} time${hours === 1 ? '' : 'r'} siden`
  const days = Math.floor(hours / 24)
  return `${days} dag${days === 1 ? '' : 'er'} siden`
}

export function getScreenStatusColor(status: string | null, lastHeartbeat: string | null): 'green' | 'yellow' | 'red' {
  if (status === 'inactive') return 'red'
  if (!lastHeartbeat) return 'red'
  const minutesSince = (Date.now() - new Date(lastHeartbeat).getTime()) / 60_000
  if (minutesSince < 3) return 'green'
  if (minutesSince < 15) return 'yellow'
  return 'red'
}

export interface AdminStats {
  onlineScreens: number
  totalScreens: number
  pendingApproval: number
  totalStores: number
  liveContent: number
}

export async function getAdminStats(supabase: AdminSupabase, tenantId: string): Promise<AdminStats> {
  const [screensResult, pendingResult, storesResult, liveResult] = await Promise.all([
    supabase.from('screens').select('id, last_heartbeat, status').eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending_approval'),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'live'),
  ])

  const screens = screensResult.data ?? []
  const onlineScreens = screens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
  ).length

  return {
    onlineScreens,
    totalScreens: screens.length,
    pendingApproval: pendingResult.count ?? 0,
    totalStores: storesResult.count ?? 0,
    liveContent: liveResult.count ?? 0,
  }
}

export interface ChainOverviewItem {
  name: string
  color: string
  storeCount: number
  totalScreens: number
  onlineScreens: number
}

// Stores that have no chain (null chain_id / null relation) are grouped here so
// they are never hidden by chain-ownership scoping.
const NO_CHAIN_ID = 'ingen-kjede'
const NO_CHAIN_NAME = 'Uten kjede'
const NO_CHAIN_COLOR = '#9ca3af'

interface EmbeddedChain {
  id: string
  name: string
  color: string
}

// Normalises the embedded `chains(...)` relation, which Supabase may return as a
// single object (FK) or an array depending on the inferred cardinality.
function resolveChain(chain: EmbeddedChain | EmbeddedChain[] | null): EmbeddedChain | null {
  if (!chain) return null
  return Array.isArray(chain) ? (chain[0] ?? null) : chain
}

export async function getChainOverview(supabase: AdminSupabase, tenantId: string): Promise<ChainOverviewItem[]> {
  // Scope by stores.tenant_id (correct join point) so every store the tenant owns
  // is counted, regardless of which tenant owns its chain.
  const { data: stores } = await supabase
    .from('stores')
    .select('id, chains(id, name, color), screens(id, status, last_heartbeat)')
    .eq('tenant_id', tenantId)
    .order('name')

  if (!stores) return []

  type OverviewStore = {
    id: string
    chains: EmbeddedChain | EmbeddedChain[] | null
    screens: Array<{ id: string; status: string | null; last_heartbeat: string | null }> | null
  }

  const byChain = new Map<string, ChainOverviewItem>()

  for (const store of stores as unknown as OverviewStore[]) {
    const chain = resolveChain(store.chains)
    const chainId = chain?.id ?? NO_CHAIN_ID
    const screens = store.screens ?? []
    const online = screens.filter(
      (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
    ).length

    const existing = byChain.get(chainId)
    if (existing) {
      existing.storeCount += 1
      existing.totalScreens += screens.length
      existing.onlineScreens += online
    } else {
      byChain.set(chainId, {
        name: chain?.name ?? NO_CHAIN_NAME,
        color: chain?.color ?? NO_CHAIN_COLOR,
        storeCount: 1,
        totalScreens: screens.length,
        onlineScreens: online,
      })
    }
  }

  return Array.from(byChain.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

export async function getScreensWithStore(supabase: AdminSupabase, tenantId: string) {
  const { data, error } = await supabase
    .from('screens')
    .select(`
      id, name, token, status, last_heartbeat, last_seen_at, app_info, pending_command, power_state,
      stores(
        id, name,
        chains(id, name, color)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

// Groups a store-first, tenant-scoped result set into the chain-board shape the
// consumers expect: Array<{ id, name, color, stores: [...] }>. Stores keep every
// field they were selected with (minus the embedded `chains` relation, which
// becomes the group key). Chains are ordered by name, stores by name.
function groupStoresByChain<S extends { name: string; chains: EmbeddedChain | EmbeddedChain[] | null }>(
  stores: S[]
): Array<{ id: string; name: string; color: string; stores: Array<Omit<S, 'chains'>> }> {
  const groups = new Map<string, { id: string; name: string; color: string; stores: Array<Omit<S, 'chains'>> }>()

  for (const store of stores) {
    const chain = resolveChain(store.chains)
    const chainId = chain?.id ?? NO_CHAIN_ID
    const { chains: _chains, ...storeFields } = store

    const existing = groups.get(chainId)
    if (existing) {
      existing.stores.push(storeFields)
    } else {
      groups.set(chainId, {
        id: chainId,
        name: chain?.name ?? NO_CHAIN_NAME,
        color: chain?.color ?? NO_CHAIN_COLOR,
        stores: [storeFields],
      })
    }
  }

  const result = Array.from(groups.values())
  for (const group of result) {
    group.stores.sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

export async function getStoresGroupedByChain(supabase: AdminSupabase, tenantId: string) {
  // Scope by stores.tenant_id so stores linked to another tenant's chain still show.
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, company_name, city, email, org_number, gln, chains(id, name, color), screens(id)')
    .eq('tenant_id', tenantId)
    .order('name')

  type GroupedStore = {
    id: string
    name: string
    company_name: string | null
    city: string | null
    email: string | null
    org_number: string | null
    gln: string | null
    chains: EmbeddedChain | EmbeddedChain[] | null
    screens: Array<{ id: string }> | null
  }

  return groupStoresByChain((stores as unknown as GroupedStore[]) ?? [])
}

export async function getStoresBoard(supabase: AdminSupabase, tenantId: string) {
  // Scope by stores.tenant_id (correct join point). Previously scoped by
  // chains.tenant_id, which hid stores whose chain is owned by another tenant.
  const { data: stores } = await supabase
    .from('stores')
    .select(
      'id, name, company_name, city, email, org_number, gln, chains(id, name, color), screens(id), store_tags(tags(id, name, color))'
    )
    .eq('tenant_id', tenantId)
    .order('name')

  type BoardStoreRow = {
    id: string
    name: string
    company_name: string | null
    city: string | null
    email: string | null
    org_number: string | null
    gln: string | null
    chains: EmbeddedChain | EmbeddedChain[] | null
    screens: Array<{ id: string }> | null
    store_tags: Array<{ tags: { id: string; name: string; color: string } | null }> | null
  }

  return groupStoresByChain((stores as unknown as BoardStoreRow[]) ?? [])
}

export async function getAllTags(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getTagsWithStores(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('tags')
    .select('id, name, color, store_tags(stores(id, name))')
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getUsersWithDetails(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('users')
    .select(`
      id, email, full_name, role,
      chains(id, name, color),
      user_stores(stores(id, name))
    `)
    .eq('tenant_id', tenantId)
    .order('full_name')

  return data ?? []
}

export async function getContentItems(
  supabase: AdminSupabase,
  tenantId: string,
  type: Database['public']['Enums']['content_type']
) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, status, type, created_at, valid_from, valid_to,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getAllContentItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, status, type, created_at, valid_from, valid_to,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getPlaylistsWithItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('playlists')
    .select(`
      id, name,
      playlist_items(
        id, position, duration_seconds,
        content_items(id, title, type)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getPendingContent(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, type, status, created_at,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })

  return data ?? []
}
