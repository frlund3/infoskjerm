"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

import type { Json } from "@/types/database"

export async function saveZoneLayout(layoutId: string, layoutJson: Json) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Ikke innlogget" }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, chain_id")
    .eq("id", user.id)
    .single()

  if (!profile?.tenant_id) return { ok: false, error: "Bruker har ikke tenant" }

  // Deactivate all existing defaults for this tenant
  await supabase
    .from("zone_layouts")
    .update({ is_default: false })
    .eq("tenant_id", profile.tenant_id)

  // Upsert this layout as the new default
  const { error } = await supabase.from("zone_layouts").upsert(
    {
      name: layoutId,
      description: layoutId,
      layout: layoutJson,
      is_default: true,
      tenant_id: profile.tenant_id,
      chain_id: profile.chain_id ?? null,
    },
    { onConflict: "name,tenant_id" }
  )

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/zones")
  return { ok: true }
}
