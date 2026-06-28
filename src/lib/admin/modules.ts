import type { AdminSupabase } from './queries'
import type { Database } from '@/types/database'

export type ModuleRow = Database['public']['Tables']['module_registry']['Row']

const categoryLabels: Record<string, string> = {
  intern_info:   'Intern info',
  salg_tilbud:   'Salg & tilbud',
  informasjon:   'Informasjon',
  media:         'Media',
  underholdning: 'Underholdning',
}

export function formatModuleCategory(category: string): string {
  return categoryLabels[category] ?? category
}

export function groupModulesByCategory(
  modules: ModuleRow[],
  activeOnly = false
): Record<string, ModuleRow[]> {
  const filtered = activeOnly ? modules.filter((m) => m.is_active) : modules
  return filtered.reduce<Record<string, ModuleRow[]>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = []
    acc[mod.category].push(mod)
    return acc
  }, {})
}

export const categoryOrder = ['intern_info', 'salg_tilbud', 'informasjon', 'media', 'underholdning']

export async function getAllModules(supabase: AdminSupabase): Promise<ModuleRow[]> {
  const { data } = await supabase
    .from('module_registry')
    .select('*')
    .order('category')
    .order('name')

  return data ?? []
}

export async function getEnabledModuleKeys(supabase: AdminSupabase, tenantId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('tenant_id', tenantId)

  return new Set((data ?? []).map((r) => r.module_key))
}

export async function toggleTenantModule(
  supabase: AdminSupabase,
  tenantId: string,
  moduleKey: string,
  enabledBy: string,
  enabled: boolean
): Promise<void> {
  if (enabled) {
    await supabase
      .from('tenant_modules')
      .upsert({ tenant_id: tenantId, module_key: moduleKey, enabled_by: enabledBy })
  } else {
    await supabase
      .from('tenant_modules')
      .delete()
      .match({ tenant_id: tenantId, module_key: moduleKey })
  }
}
