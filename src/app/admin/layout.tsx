import { Sidebar } from "@/components/admin/sidebar"
import { MobileNav } from "@/components/admin/mobile-nav"
import { PwaManager } from "@/components/pwa/pwa-manager"
import { QuickCapture } from "@/components/pwa/quick-capture"
import { BiometricLock } from "@/components/pwa/biometric-lock"
import { ChainThemeProvider } from "@/components/admin/chain-theme-provider"
import { TenantConfigProvider } from "@/components/admin/tenant-config-provider"
import { getTenantConfig } from "@/lib/tenant/config"
import { createClient } from "@/lib/supabase/server"
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
    .select("full_name, role, tenant_id, chains(name, color, brand_light, brand_fg)")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const chain = (profile as unknown as { chains: { name: string; color: string; brand_light: string | null; brand_fg: string | null } | null } | null)?.chains ?? null
  const chainKey = role === "super_admin" ? "super_admin" : (chain?.name ?? "SPAR")
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
