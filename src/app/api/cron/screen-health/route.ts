import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find active screens that haven't sent a heartbeat in over 10 minutes
  // We only alert on screens with status='active' (not maintenance/inactive)
  // and that have been seen before (last_heartbeat is not null) — meaning
  // they were previously online and have now gone silent.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: offlineScreens, error } = await supabase
    .from("screens")
    .select("id, name, store_id, tenant_id, last_heartbeat, status")
    .eq("status", "active")
    .not("last_heartbeat", "is", null)
    .lt("last_heartbeat", tenMinutesAgo)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!offlineScreens || offlineScreens.length === 0) {
    return NextResponse.json({ ok: true, offlineCount: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  // Group screens by tenant so each tenant gets one email
  const byTenant = offlineScreens.reduce<
    Record<string, typeof offlineScreens>
  >((acc, s) => {
    if (!acc[s.tenant_id]) acc[s.tenant_id] = []
    acc[s.tenant_id].push(s)
    return acc
  }, {})

  let emailsSent = 0

  for (const [tenantId, screens] of Object.entries(byTenant)) {
    // Get super_admin and chain_manager users for this tenant
    const { data: admins } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("tenant_id", tenantId)
      .in("role", ["super_admin", "chain_manager"])

    if (!admins?.length) continue

    const screenList = screens
      .map(
        (s) =>
          `• ${s.name} (sist sett: ${new Date(s.last_heartbeat as string).toLocaleString("nb-NO")})`
      )
      .join("\n")

    const count = screens.length
    const subject = `⚠️ ${count} skjerm${count > 1 ? "er" : ""} er offline`

    try {
      await resend.emails.send({
        from: "Infoskjerm <noreply@framtidmedia.no>",
        to: admins.map((a) => a.email),
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #18181b;">Skjermvarsling</h2>
            <p>Følgende skjerm${count > 1 ? "er" : ""} har ikke sendt hjerteslag på over 10 minutter:</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-line; font-size: 14px; color: #991b1b;">
${screenList}
            </div>
            <a href="${appUrl}/admin/screens" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
              Sjekk skjermstatus →
            </a>
          </div>
        `,
        text: `Følgende skjermer har ikke sendt hjerteslag på over 10 minutter:\n\n${screenList}\n\nSjekk status: ${appUrl}/admin/screens`,
      })
      emailsSent++
    } catch {
      // Non-blocking — log failure but continue processing other tenants
    }
  }

  return NextResponse.json({
    ok: true,
    offlineCount: offlineScreens.length,
    tenantsNotified: emailsSent,
  })
}
