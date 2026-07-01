"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"
import { sendInviteEmail } from "@/lib/email/resend"
import {
  type UserRole,
  USER_MANAGER_ROLES,
  invitableRolesFor,
  isStoreScopedRole,
} from "@/lib/roles"

type InvitableRole = Exclude<UserRole, "super_admin">

// Tenant Admin (chain_manager) får tilgang til alle butikker og trenger derfor
// ingen eksplisitt butikkliste. Øvrige roller er butikk-scopet.
const TENANT_WIDE_ROLES: UserRole[] = ["chain_manager"]

// Butikkene den innloggede faktisk har tilgang til (fra user_stores). Leses via
// admin-klient etter at rollen er verifisert, så den ikke avhenger av RLS.
async function getActorStoreIds(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string
): Promise<string[]> {
  const { data } = await admin.from("user_stores").select("store_id").eq("user_id", actorId)
  return (data ?? []).map((r) => r.store_id)
}

export async function inviteUser(
  email: string,
  role: InvitableRole,
  storeIds: string[] = []
) {
  const { tenantId, userId: actorId, role: actorRole } = await requireRole(USER_MANAGER_ROLES)
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return { ok: false, error: "E-post mangler" }

  // Actor kan kun invitere roller den har lov til (butikk-admins → kun enhetsadmin).
  if (!invitableRolesFor(actorRole).includes(role)) {
    return { ok: false, error: "Du har ikke tilgang til å invitere denne rollen" }
  }

  const admin = createAdminClient()

  const isTenantWide = TENANT_WIDE_ROLES.includes(role)
  let cleanStoreIds = storeIds

  if (isStoreScopedRole(actorRole)) {
    // Butikk-admin: kan kun tildele egne enheter (invitableRolesFor har allerede
    // låst rollen til en butikk-scopet rolle, så isTenantWide er alltid false).
    const actorStoreIds = await getActorStoreIds(admin, actorId)
    cleanStoreIds = storeIds.filter((sid) => actorStoreIds.includes(sid))
    if (cleanStoreIds.length === 0) {
      return { ok: false, error: "Velg minst én av dine egne enheter" }
    }
  } else if (!isTenantWide && cleanStoreIds.length === 0) {
    return { ok: false, error: "Velg minst én butikk for denne rollen" }
  }

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
  if (!isTenantWide && cleanStoreIds.length > 0) {
    await admin.from("user_stores").delete().eq("user_id", userId)
    const { error: storeError } = await admin
      .from("user_stores")
      .insert(cleanStoreIds.map((sid) => ({ user_id: userId, store_id: sid })))
    if (storeError) return { ok: false, error: `Butikktilgang: ${storeError.message}` }

    const { data: stores } = await admin.from("stores").select("name").in("id", cleanStoreIds)
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

  await logAudit({ userId: actorId, action: "user.invite", entityType: "user", entityId: userId, summary: `Inviterte ${cleanEmail} som ${ROLE_LABEL[role]}`, metadata: { role, storeNames } })
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
  const { supabase, userId: actorId, tenantId } = await requireRole(["super_admin", "chain_manager"])
  const { data: target } = await supabase.from("users").select("email").eq("id", userId).eq("tenant_id", tenantId).maybeSingle()
  // Bekreft at brukeren tilhører kallers tenant FØR sletting — ellers ville
  // auth-sletting under kunne kjørt selv om DB-raden var utenfor tenant.
  if (!target) return { ok: false, error: "Bruker ikke funnet" }
  const { error } = await supabase.from("users").delete().eq("id", userId).eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId: actorId, action: "user.delete", entityType: "user", entityId: userId, summary: `Slettet bruker ${target?.email ?? userId}` })

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
  const { supabase, userId: actorId, tenantId } = await requireRole(["super_admin", "chain_manager"])
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .eq("tenant_id", tenantId)
  if (error) return { ok: false, error: error.message }
  await logAudit({ userId: actorId, action: "user.role", entityType: "user", entityId: userId, summary: `Endret rolle til ${role}`, metadata: { role } })
  revalidatePath("/admin/users")
  return { ok: true }
}

export async function setUserStores(userId: string, storeIds: string[]) {
  // Kun tenant-brede admins kan redigere butikktilgang på eksisterende brukere.
  // Butikk-admins kan invitere (med egne enheter), men ikke omfordele tilgang –
  // det ville kreve å bevare mål utenfor deres eget scope ved replace.
  const { supabase, userId: actorId, tenantId } = await requireRole(["super_admin", "chain_manager"])
  // Verifiser at målbruker OG butikkene tilhører kallers tenant (RLS håndhever
  // også via user_stores_write – dette gir tydelig feil + forsvar i dybden).
  const { data: target } = await supabase.from("users").select("id").eq("id", userId).eq("tenant_id", tenantId).maybeSingle()
  if (!target) return { ok: false, error: "Bruker ikke funnet" }
  if (storeIds.length > 0) {
    const { data: okStores } = await supabase.from("stores").select("id").in("id", storeIds).eq("tenant_id", tenantId)
    if ((okStores?.length ?? 0) !== storeIds.length) return { ok: false, error: "Ugyldig butikkvalg" }
  }
  // Replace the user's store assignments
  const { error: delError } = await supabase.from("user_stores").delete().eq("user_id", userId)
  if (delError) return { ok: false, error: delError.message }
  if (storeIds.length > 0) {
    const { error } = await supabase
      .from("user_stores")
      .insert(storeIds.map((sid) => ({ user_id: userId, store_id: sid })))
    if (error) return { ok: false, error: error.message }
  }
  await logAudit({ userId: actorId, action: "user.stores", entityType: "user", entityId: userId, summary: `Oppdaterte butikktilgang (${storeIds.length} butikker)`, metadata: { storeIds } })
  revalidatePath("/admin/users")
  return { ok: true }
}
