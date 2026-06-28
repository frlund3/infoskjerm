import { requireRole } from "@/lib/admin/require-role"
import { ContentForm, type StoreOption, type TagOption } from "../_components/content-form"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function NewContentPage() {
  const { supabase } = await requireRole([...AUTHOR_ROLES])

  const [{ data: stores }, { data: tags }] = await Promise.all([
    supabase.from("stores").select("id, name, city, chains(name)").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ])

  const storeOptions: StoreOption[] = (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    chain: (s.chains as { name: string } | null)?.name ?? null,
    city: s.city,
  }))
  const tagOptions: TagOption[] = (tags ?? []) as TagOption[]

  return <ContentForm stores={storeOptions} tags={tagOptions} />
}
