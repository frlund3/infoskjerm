"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/admin/require-role"
import type { Json } from "@/types/database"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

// Store manager sends content for approval
export async function submitForApproval(contentItemId: string) {
  const { supabase, userId } = await requireUser()

  // Snapshot current state
  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single()

  const { error } = await supabase
    .from("content_items")
    .update({ status: "pending_approval", updated_at: new Date().toISOString() })
    .eq("id", contentItemId)

  if (error) return { ok: false, error: error.message }

  // Log it
  await supabase.from("publish_log").insert({
    content_item_id: contentItemId,
    action: "submitted_for_approval",
    performed_by: userId,
    snapshot: (item ?? {}) as Json,
  })

  revalidatePath("/admin/publish")
  return { ok: true }
}

// Chain manager / super_admin approves
export async function approveContent(contentItemId: string) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager"])

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single()

  const { error } = await supabase
    .from("content_items")
    .update({ status: "approved", approved_by: userId, updated_at: new Date().toISOString() })
    .eq("id", contentItemId)

  if (error) return { ok: false, error: error.message }

  await supabase.from("publish_log").insert({
    content_item_id: contentItemId,
    action: "approved",
    performed_by: userId,
    snapshot: (item ?? {}) as Json,
  })

  revalidatePath("/admin/publish")
  return { ok: true }
}

// Chain manager / super_admin rejects
export async function rejectContent(contentItemId: string, reason?: string) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager"])

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single()

  const { error } = await supabase
    .from("content_items")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", contentItemId)

  if (error) return { ok: false, error: error.message }

  await supabase.from("publish_log").insert({
    content_item_id: contentItemId,
    action: "rejected",
    performed_by: userId,
    snapshot: { ...(item as Record<string, unknown>), rejection_reason: reason } as Json,
  })

  revalidatePath("/admin/publish")
  return { ok: true }
}

type TargetMode = "all" | "chains" | "tags" | "stores"

// Publish now (or schedule)
export async function publishContent(
  contentItemId: string,
  targetMode: TargetMode,
  selectedIds: string[],
  scheduledAt?: string | null
) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager"])

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single()

  if (!item) return { ok: false, error: "Innhold ikke funnet" }

  const newStatus = scheduledAt ? "scheduled" : "live"
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("content_items")
    .update({
      status: newStatus,
      published_at: scheduledAt ? null : now,
      scheduled_at: scheduledAt ?? null,
      updated_at: now,
    })
    .eq("id", contentItemId)

  if (updateError) return { ok: false, error: updateError.message }

  // Insert content targets
  const targets: Array<{
    content_item_id: string
    target_all: boolean | null
    chain_id: string | null
    tag_id: string | null
    store_id: string | null
  }> = []

  if (targetMode === "all") {
    targets.push({ content_item_id: contentItemId, target_all: true, chain_id: null, tag_id: null, store_id: null })
  } else if (targetMode === "chains") {
    for (const id of selectedIds) {
      targets.push({ content_item_id: contentItemId, target_all: null, chain_id: id, tag_id: null, store_id: null })
    }
  } else if (targetMode === "tags") {
    for (const id of selectedIds) {
      targets.push({ content_item_id: contentItemId, target_all: null, chain_id: null, tag_id: id, store_id: null })
    }
  } else {
    for (const id of selectedIds) {
      targets.push({ content_item_id: contentItemId, target_all: null, chain_id: null, tag_id: null, store_id: id })
    }
  }

  if (targets.length > 0) {
    await supabase.from("content_targets").upsert(targets)
  }

  // Log
  await supabase.from("publish_log").insert({
    content_item_id: contentItemId,
    action: scheduledAt ? "scheduled" : "published",
    performed_by: userId,
    snapshot: (item ?? {}) as Json,
  })

  revalidatePath("/admin/publish")
  revalidatePath("/admin")
  return { ok: true }
}

// Rollback a publish (restore from snapshot)
export async function rollbackContent(publishLogId: string) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager"])

  const { data: logEntry } = await supabase
    .from("publish_log")
    .select("*")
    .eq("id", publishLogId)
    .single()

  if (!logEntry?.content_item_id) return { ok: false, error: "Loggoppføring ikke funnet" }

  const snapshot = logEntry.snapshot as Record<string, unknown>

  // Restore only whitelisted fields from snapshot — never spread unknown keys
  const RESTORABLE_FIELDS = ["title", "type", "body", "valid_from", "valid_to", "scheduled_at"] as const
  const safeRestore: Record<string, unknown> = {}
  for (const field of RESTORABLE_FIELDS) {
    if (field in snapshot) safeRestore[field] = snapshot[field as keyof typeof snapshot]
  }

  const { error } = await supabase
    .from("content_items")
    .update({
      ...safeRestore,
      status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", logEntry.content_item_id)

  if (error) return { ok: false, error: error.message }

  // Log the rollback
  await supabase.from("publish_log").insert({
    content_item_id: logEntry.content_item_id,
    action: "rolled_back",
    performed_by: userId,
    snapshot: snapshot as Json,
  })

  revalidatePath("/admin/publish")
  return { ok: true }
}
