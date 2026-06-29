"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"
import { sendInviteEmail } from "@/lib/email/resend"
import { type UserRole } from "@/lib/roles"

type InvitableRole = Exclude<UserRole, "super_admin">

// Tenant Admin (chain_manager) får tilgang til alle butikker og trenger derfor
// ingen eksplisitt butikkliste. Øvrige roller er butikk-scopet.
const TENANT_WIDE_ROLES: UserRole[] = ["chain_manager"]

export async function inviteUser(
  email: string,
  role: InvitableRole,
  storeIds: string[] = []
) {
  const { tenantId } = await requireRole(["super_admin", "chain_manager"])
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return { ok: false, error: "E-post mangler" }

  const isTenantWide = TENANT_WIDE_ROLES.includes(role)
  if (!isTenantWide && storeIds.length === 0) {
    return { ok: false, error: "Velg minst én butikk for denne rollen" }
  }

  const admin = createAdminClient()

  // 1) Opprett auth-bruker og hent en invitasjons-token (token_hash) vi selv
  //    bygger lenken rundt — så vi slipper å være avhengig av Supabase sin
  //    redirect-allowlist og kan sende e-posten via Resend.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: cleanEmail,
    options: { data: { role } },
  })
  if (linkError || !linkData?.user) {
    const msg = linkError?.message ?? "Kunne ikke opprette invitasjon"
    return { ok: false, error: msg.includes("registered") ? "Brukeren finnes allerede" : msg }
  }

  const userId = linkData.user.id
  const tokenHash = linkData.properties?.hashed_token
  if (!tokenHash) {
    return { ok: false, error: "Mangler invitasjons-token fra Supabase" }
  }

  // 2) Opprett profilrad (ingen DB-trigger gjør dette automatisk). Uten denne
  //    blir den inviterte brukeren rolleløs og får ikke tilgang.
  const { error: profileError } = await admin.from("users").upsert(
    {
      id: userId,
      tenant_id: tenantId,
      email: cleanEmail,
      full_name: cleanEmail.split("@")[0],
      role,
    },
    { onConflict: "id" }
  )
  if (profileError) return { ok: false, error: `Profil: ${profileError.message}` }

  // 3) Butikktilgang (kun for butikk-scopede roller).
  let storeNames: string[] = []
  if (!isTenantWide && storeIds.length > 0) {
    await admin.from("user_stores").delete().eq("user_id", userId)
    const { error: storeError } = await admin
      .from("user_stores")
      .insert(storeIds.map((sid) => ({ user_id: userId, store_id: sid })))
    if (storeError) return { ok: false, error: `Butikktilgang: ${storeError.message}` }

    const { data: stores } = await admin.from("stores").select("name").in("id", storeIds)
    storeNames = (stores ?? []).map((s) => s.name)
  }

  // 4) Send branded invitasjon via Resend.
  const base = await getBaseUrl()
  const link = `${base}/auth/callback?token_hash=${tokenHash}&type=invite&next=${encodeURIComponent("/velkommen")}`
  try {
    await sendInviteEmail({ to: cleanEmail, link, role: ROLE_LABEL[role], storeNames })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ukjent feil ved e-postsending"
    return { ok: false, error: `Bruker opprettet, men e-post feilet: ${msg}` }
  }

  revalidatePath("/admin/users")
  return { ok: true }
}

const ROLE_LABEL: Record<InvitableRole, string> = {
  chain_manager: "Tenant Admin",
  area_manager: "Flerenhetsadmin",
  store_manager: "Enhetsadmin",
  store_employee: "Redaktør",
}

export async function deleteUser(userId: string) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase.from("users").delete().eq("id", userId)
  if (error) return { ok: false, error: error.message }

  // Also delete from Supabase Auth so the user cannot log in again
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  // Don't block the response if auth deletion fails — the row is already deleted
  if (authError) {
    console.error("Feil ved sletting fra auth.users:", authError.message)
  }

  revalidatePath("/admin/users")
  return { ok: true }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/users")
  return { ok: true }
}

export async function setUserStores(userId: string, storeIds: string[]) {
  const { supabase } = await requireRole(["super_admin", "chain_manager", "area_manager"])
  // Replace the user's store assignments
  const { error: delError } = await supabase.from("user_stores").delete().eq("user_id", userId)
  if (delError) return { ok: false, error: delError.message }
  if (storeIds.length > 0) {
    const { error } = await supabase
      .from("user_stores")
      .insert(storeIds.map((sid) => ({ user_id: userId, store_id: sid })))
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath("/admin/users")
  return { ok: true }
}
