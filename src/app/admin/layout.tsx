import { Sidebar } from "@/components/admin/sidebar"
import { MobileNav } from "@/components/admin/mobile-nav"
import { PwaManager } from "@/components/pwa/pwa-manager"
import { QuickCapture } from "@/components/pwa/quick-capture"
import { BiometricLock } from "@/components/pwa/biometric-lock"
import { ChainThemeProvider } from "@/components/admin/chain-theme-provider"
import { TenantConfigProvider } from "@/components/admin/tenant-config-provider"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { listAllTenants } from "@/lib/admin/tenants"
import { redirect } from "next/navigation"
import { Toaster } from "sonner"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const ctx = await getAdminContext()

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, tenant_id, chains(name, color, brand_light, brand_fg, logo_url)")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  type ChainBrand = { name: string; color: string; brand_light: string | null; brand_fg: string | null; logo_url: string | null }
  let chain = (profile as unknown as { chains: ChainBrand | null } | null)?.chains ?? null

  // Merkevare (logo/farge/navn) skal følge den AKTIVE tenanten under act-as, ikke
  // super_adminens egen. Hentes via service-role — super_admin får ikke lese en
  // annen tenant sine kjeder gjennom RLS.
  if (ctx?.isImpersonating && ctx.activeTenant) {
    const admin = createAdminClient()
    const { data: activeChain } = await (admin
      .from("chains") as unknown as {
      select: (c: string) => { eq: (k: string, v: string) => { order: (o: string) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: ChainBrand | null }> } } } }
    })
      .select("name, color, brand_light, brand_fg, logo_url")
      .eq("tenant_id", ctx.activeTenant.id)
      .order("name")
      .limit(1)
      .maybeSingle()
    if (activeChain) chain = activeChain
  }

  const chainKey = role === "super_admin" && !ctx?.isImpersonating ? "super_admin" : (chain?.name ?? "SPAR")
  // Terminologi/avdelinger skal følge den AKTIVE tenanten (act-as), ikke
  // super_adminens egen. effectiveTenantId = impersonert tenant når man opptrer
  // som en; ellers brukerens egen tenant.
  const tenantConfig = await getTenantConfig(supabase, ctx?.effectiveTenantId || profile?.tenant_id || null)

  // Kun super_admin kan opptre som andre tenants → hent listen for switcheren.
  // Andre roller får tom liste, og switcheren skjuler seg selv.
  const tenants = role === "super_admin"
    ? (await listAllTenants()).map((t) => ({ id: t.id, name: t.name, slug: t.slug }))
    : []

  return (
    <ChainThemeProvider
      chainKey={chainKey}
      brandPrimary={chain?.color ?? undefined}
      brandLight={chain?.brand_light ?? undefined}
      brandFg={chain?.brand_fg ?? undefined}
    >
      <TenantConfigProvider config={tenantConfig}>
      <div className="min-h-screen bg-[var(--background)]">
        {(() => {
          const navUser = {
            email: user.email ?? "",
            fullName: profile?.full_name ?? "Admin",
            role,
            chainName: chain?.name ?? null,
            chainColor: chain?.color ?? null,
            chainLogoUrl: chain?.logo_url ?? null,
            isImpersonating: ctx?.isImpersonating ?? false,
            activeTenantName: ctx?.activeTenant?.name ?? null,
            tenants,
            activeTenantId: ctx?.activeTenant?.id ?? null,
          }
          return (
            <>
              <div className="hidden md:block">
                <Sidebar user={navUser} />
              </div>
              <MobileNav user={navUser} />
              <main className="md:ml-64 min-h-screen flex flex-col">
                {children}
              </main>
            </>
          )
        })()}
      </div>
      <PwaManager />
      <QuickCapture />
      <BiometricLock />
      <Toaster richColors position="bottom-right" />
      </TenantConfigProvider>
    </ChainThemeProvider>
  )
}
