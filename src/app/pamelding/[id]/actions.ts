"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { sendEventSignupConfirmation } from "@/lib/email/resend"

export interface SignupInput {
  name: string
  department: string
  guests: number
  dietary: string
  comment: string
  email: string
  consent: boolean
}

/**
 * Public event sign-up. Called from the /pamelding/<id> landing page (no auth).
 * Runs server-side with the service role, so the signups table stays private
 * (mirrors the kundeklubb join flow). Optionally e-mails a confirmation.
 */
export async function signupForEvent(
  contentItemId: string,
  storeId: string | null,
  input: SignupInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: "Skriv inn navnet ditt" }
  if (!input.consent) return { ok: false, error: "Du må godta at vi lagrer påmeldingen" }

  const supabase = createAdminClient()

  // Verify the invitation exists, is live, and still accepts sign-ups.
  const { data: item } = await supabase
    .from("content_items")
    .select("id, title, tenant_id, type, status, body")
    .eq("id", contentItemId)
    .maybeSingle()
  if (!item || item.type !== "invitation") return { ok: false, error: "Fant ikke invitasjonen" }
  if (item.status !== "live") return { ok: false, error: "Påmeldingen er ikke åpen" }

  const body = (item.body ?? {}) as { invitation?: { signupEnabled?: boolean; signupDeadline?: string | null } }
  if (body.invitation?.signupEnabled === false) return { ok: false, error: "Påmelding er stengt for dette arrangementet" }
  const deadline = body.invitation?.signupDeadline
  if (deadline) {
    const end = new Date(deadline)
    end.setHours(23, 59, 59, 999)
    if (!Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
      return { ok: false, error: "Påmeldingsfristen har gått ut" }
    }
  }

  const guests = Number.isFinite(input.guests) && input.guests > 0 ? Math.min(Math.floor(input.guests), 20) : 0
  const email = input.email.trim()

  const { error } = await supabase.from("event_signups").insert({
    content_item_id: item.id,
    tenant_id: item.tenant_id,
    store_id: storeId,
    name,
    department: input.department.trim() || null,
    guests,
    dietary: input.dietary.trim() || null,
    comment: input.comment.trim() || null,
    email: email || null,
    consent: true,
  })
  if (error) return { ok: false, error: "Noe gikk galt — prøv igjen" }

  // Best-effort confirmation e-mail (never blocks the sign-up).
  if (email) {
    try {
      await sendEventSignupConfirmation({ to: email, name, eventTitle: item.title, guests })
    } catch {
      // ignore — sign-up is already stored
    }
  }

  await logAudit({
    action: "event.signup",
    entityType: "invitation",
    entityId: item.id,
    summary: `Ny påmelding til «${item.title}» (${name}${guests > 0 ? ` +${guests}` : ""})`,
  })
  return { ok: true }
}
