"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"
import { sendInviteEmail } from "@/lib/email/resend"

type ActionResult = { ok: true; tenantId?: string } | { ok: false; error: string }

const SLUG_PATTERN = /^[a-z0-9-]+$/

interface CreateTenantInput {
  name: string
  slug: string
  adminEmail: string
}

/**
 * Oppretter en ny tenant og inviterer den første Tenant Admin (chain_manager).
 * Invitasjonen speiler mekanismen i inviteUser(): auth.admin.generateLink
 * (type "invite") → profilrad i public.users → branded Resend-e-post med en
 * token_hash-lenke bygget rundt getBaseUrl().
 */
export async function createTenant(input: CreateTenantInput): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()

  const name = input.name.trim()
  const slug = input.slug.trim().toLowerCase()
  const adminEmail = input.adminEmail.trim().toLowerCase()

  if (!name) return { ok: false, error: "Navn mangler" }
  if (!slug) return { ok: false, error: "Slug mangler" }
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Slug kan kun inneholde små bokstaver, tall og bindestrek" }
  }
  if (!adminEmail) return { ok: false, error: "Admin-e-post mangler" }

  const admin = createAdminClient()

  try {
    // 1) Opprett tenant.
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({ name, slug })
      .select("id")
      .single()

    if (tenantError || !tenant) {
      const msg = tenantError?.message ?? "Kunne ikke opprette tenant"
      const isSlugConflict = /duplicate key|unique/i.test(msg) && /slug/i.test(msg)
      return {
        ok: false,
        error: isSlugConflict ? `Slug «${slug}» er allerede i bruk` : msg,
      }
    }

    const tenantId = tenant.id

    // 2) Opprett auth-bruker + invitasjons-token (token_hash) — samme som inviteUser.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: adminEmail,
      options: { data: { role: "chain_manager" } },
    })
    if (linkError || !linkData?.user) {
      const msg = linkError?.message ?? "Kunne ikke opprette invitasjon"
      return {
        ok: false,
        error: msg.includes("registered") ? "Brukeren finnes allerede" : msg,
      }
    }

    const newUserId = linkData.user.id
    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash) {
      return { ok: false, error: "Mangler invitasjons-token fra Supabase" }
    }

    // 3) Opprett profilrad (ingen DB-trigger gjør dette). Tenant Admin er
    //    tenant-scopet og trenger ingen eksplisitt butikkliste.
    const { error: profileError } = await admin.from("users").upsert(
      {
        id: newUserId,
        tenant_id: tenantId,
        email: adminEmail,
        full_name: adminEmail.split("@")[0],
        role: "chain_manager",
      },
      { onConflict: "id" }
    )
    if (profileError) return { ok: false, error: `Profil: ${profileError.message}` }

    // 4) Send branded invitasjon via Resend — samme steg som inviteUser.
    const base = await getBaseUrl()
    const link = `${base}/auth/callback?token_hash=${tokenHash}&type=invite&next=${encodeURIComponent("/velkommen")}`
    try {
      await sendInviteEmail({ to: adminEmail, link, role: "Tenant Admin", storeNames: [] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ukjent feil ved e-postsending"
      return { ok: false, error: `Tenant opprettet, men e-post feilet: ${msg}` }
    }

    await logAudit({
      userId,
      action: "tenant.create",
      entityType: "tenant",
      entityId: tenantId,
      summary: `Opprettet tenant «${name}» og inviterte ${adminEmail} som Tenant Admin`,
      metadata: { slug, adminEmail },
      tenantId,
    })
    revalidatePath("/admin/plattform/tenants")
    return { ok: true, tenantId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ukjent feil ved oppretting av tenant"
    return { ok: false, error: msg }
  }
}

export async function updateTenant(id: string, name: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const clean = name.trim()
  if (!clean) return { ok: false, error: "Navn mangler" }

  const admin = createAdminClient()
  const { error } = await admin.from("tenants").update({ name: clean }).eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "tenant.update",
    entityType: "tenant",
    entityId: id,
    summary: `Endret tenant-navn til «${clean}»`,
    metadata: { name: clean },
    tenantId: id,
  })
  revalidatePath("/admin/plattform/tenants")
  return { ok: true }
}

// status/archived_at (036) er ikke i genererte typer → cast payloaden slik
// config.ts-mønsteret gjør for tenant-utvidelser.
async function setTenantLifecycle(
  id: string,
  payload: { status: string; archived_at: string | null }
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await (admin.from("tenants") as unknown as {
    update: (values: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> }
  })
    .update(payload)
    .eq("id", id)
  return { error: error?.message ?? null }
}

export async function suspendTenant(id: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const { error } = await setTenantLifecycle(id, { status: "suspended", archived_at: null })
  if (error) return { ok: false, error }

  await logAudit({
    userId,
    action: "tenant.suspend",
    entityType: "tenant",
    entityId: id,
    summary: "Suspenderte tenant",
    tenantId: id,
  })
  revalidatePath("/admin/plattform/tenants")
  return { ok: true }
}

export async function reactivateTenant(id: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const { error } = await setTenantLifecycle(id, { status: "active", archived_at: null })
  if (error) return { ok: false, error }

  await logAudit({
    userId,
    action: "tenant.reactivate",
    entityType: "tenant",
    entityId: id,
    summary: "Reaktiverte tenant",
    tenantId: id,
  })
  revalidatePath("/admin/plattform/tenants")
  return { ok: true }
}

export async function archiveTenant(id: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const { error } = await setTenantLifecycle(id, {
    status: "archived",
    archived_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error }

  await logAudit({
    userId,
    action: "tenant.archive",
    entityType: "tenant",
    entityId: id,
    summary: "Arkiverte tenant",
    tenantId: id,
  })
  revalidatePath("/admin/plattform/tenants")
  return { ok: true }
}
