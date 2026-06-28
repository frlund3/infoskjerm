import { Sidebar } from "@/components/admin/sidebar"
import { ChainThemeProvider } from "@/components/admin/chain-theme-provider"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, chains(name, color, brand_light, brand_fg)")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const chain = (profile as unknown as { chains: { name: string; color: string; brand_light: string | null; brand_fg: string | null } | null } | null)?.chains ?? null
  const chainKey = role === "super_admin" ? "super_admin" : (chain?.name ?? "SPAR")

  return (
    <ChainThemeProvider
      chainKey={chainKey}
      brandPrimary={chain?.color ?? undefined}
      brandLight={chain?.brand_light ?? undefined}
      brandFg={chain?.brand_fg ?? undefined}
    >
      <div className="min-h-screen bg-[var(--background)]">
        <Sidebar
          user={{
            email: user.email ?? "",
            fullName: profile?.full_name ?? "Admin",
            role,
            chainName: chain?.name ?? null,
            chainColor: chain?.color ?? null,
          }}
        />
        <main className="ml-64 min-h-screen flex flex-col">
          {children}
        </main>
      </div>
    </ChainThemeProvider>
  )
}
