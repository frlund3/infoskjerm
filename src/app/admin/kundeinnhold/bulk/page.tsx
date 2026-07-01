import { requireRole } from "@/lib/admin/require-role"
import { canTargetAllStores } from "@/lib/roles"
import { loadStoreOptions } from "../../innhold/store-options"
import type { TagOption } from "../../innhold/_components/content-form"
import { BulkImport } from "./bulk-import"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function BulkOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ lenker?: string }>
}) {
  const { supabase, role, tenantId } = await requireRole([...AUTHOR_ROLES])
  const { lenker } = await searchParams
  const [storeOptions, { data: tags }] = await Promise.all([
    loadStoreOptions(supabase, tenantId),
    supabase.from("tags").select("id, name, color").eq("tenant_id", tenantId).order("name"),
  ])
  return (
    <BulkImport
      stores={storeOptions}
      tags={(tags ?? []) as TagOption[]}
      initialLinks={lenker ?? ""}
      canTargetAll={canTargetAllStores(role)}
    />
  )
}
