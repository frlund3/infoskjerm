import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { OnboardingWizard } from "./_components/onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") redirect("/admin")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Ny tenant"
        subtitle="Onboarding-veiviser for ny organisasjon"
      />
      <div className="flex-1 p-6">
        <OnboardingWizard />
      </div>
    </div>
  )
}
