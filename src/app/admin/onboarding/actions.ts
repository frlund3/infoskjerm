"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createTenant(name: string, slug: string) {
  const supabase = await createClient()

  // Check uniqueness
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single()

  if (existing) return { ok: false, error: `Slug '${slug}' er allerede i bruk`, tenantId: undefined }

  const { data, error } = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message, tenantId: undefined }
  revalidatePath("/admin/onboarding")
  return { ok: true, tenantId: data.id }
}

export async function createChainForTenant(
  tenantId: string,
  chainName: "SPAR" | "EUROSPAR" | "JOKER",
  color: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chains")
    .insert({ tenant_id: tenantId, name: chainName, color })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message, chainId: undefined }
  return { ok: true, chainId: data.id }
}

export async function createStoreForChain(
  tenantId: string,
  chainId: string,
  storeName: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stores")
    .insert({
      tenant_id: tenantId,
      chain_id: chainId,
      name: storeName,
      // Required fields with placeholder values for onboarding
      city: "",
      company_name: storeName,
      email: "",
      gln: "",
      org_number: "",
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message, storeId: undefined }
  return { ok: true, storeId: data.id }
}
