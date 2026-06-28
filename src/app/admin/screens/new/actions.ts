"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createRegistrationCode(storeId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Ikke innlogget" }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("screen_registration_codes")
      .select("id")
      .eq("code", code)
      .single()
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { data, error } = await supabase
    .from("screen_registration_codes")
    .insert({
      code,
      tenant_id: profile.tenant_id,
      store_id: storeId || null,
    })
    .select("id, code, expires_at")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/screens")
  return { ok: true, code: data.code, expiresAt: data.expires_at }
}
