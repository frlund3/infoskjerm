import { requireRole } from "@/lib/admin/require-role"
import { canTargetAllStores } from "@/lib/roles"
import { ContentForm, type TagOption } from "../../innhold/_components/content-form"
import { loadStoreOptions } from "../../innhold/store-options"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function NewInvitationPage() {
  const { supabase, role, tenantId } = await requireRole([...AUTHOR_ROLES])

  const [storeOptions, { data: tags }] = await Promise.all([
    loadStoreOptions(supabase, tenantId),
    supabase.from("tags").select("id, name, color").eq("tenant_id", tenantId).order("name"),
  ])

  return (
    <ContentForm
      stores={storeOptions}
      tags={(tags ?? []) as TagOption[]}
      audience="intern"
      defaultType="invitation"
      listHref="/admin/invitasjoner"
      canTargetAll={canTargetAllStores(role)}
    />
  )
}
