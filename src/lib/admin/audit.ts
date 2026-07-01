import { createAdminClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"

/**
 * Append-only audit trail. Every meaningful action (login, content changes,
 * publishing, deletions, store/user/settings edits) is recorded here via the
 * service role, so it works regardless of the caller's RLS. Logging is
 * best-effort: a logging failure must never break the underlying action.
 */

export interface AuditEvent {
  /** Auth user id of the actor (from requireRole). */
  userId?: string | null
  /** Pre-resolved actor label; resolved from the users table when omitted. */
  userEmail?: string | null
  /** Dotted action key, e.g. "content.publish", "auth.login", "user.delete". */
  action: string
  entityType?: string | null
  entityId?: string | null
  /** Human-readable one-liner shown in the log viewer. */
  summary: string
  metadata?: Record<string, unknown> | null
  /** Effektiv tenant. Utledes fra admin-konteksten når den ikke settes eksplisitt. */
  tenantId?: string | null
}

export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    const supabase = createAdminClient()
    let label = event.userEmail ?? null
    if (!label && event.userId) {
      const { data } = await supabase.from("users").select("full_name, email").eq("id", event.userId).maybeSingle()
      label = data?.full_name || data?.email || null
    }

    // Utled effektiv tenant selv, så ingen av de ~25 kallstedene må endres. I en
    // public/uten-økt-kontekst (f.eks. auth-callback) finnes ingen admin-kontekst;
    // da logger vi uten tenant.
    let tenantId = event.tenantId ?? null
    if (!tenantId) {
      try {
        const ctx = await getAdminContext()
        tenantId = ctx?.effectiveTenantId ?? null
      } catch {
        /* public/no-session context */
      }
    }

    // audit_log.tenant_id finnes ennå ikke i genererte typer (migrasjon 033) →
    // cast payloaden slik den eksisterende metadata-casten gjør.
    await supabase.from("audit_log").insert({
      user_id: event.userId ?? null,
      user_email: label,
      action: event.action,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      summary: event.summary,
      metadata: event.metadata ?? null,
      tenant_id: tenantId,
    } as never)
  } catch {
    // Never let auditing break the action it records.
  }
}
