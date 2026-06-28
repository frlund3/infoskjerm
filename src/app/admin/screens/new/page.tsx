import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { NewScreenClient } from "./_components/new-screen-client"

export const dynamic = "force-dynamic"

export default async function NewScreenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, chains(name, color)")
    .eq("tenant_id", profile?.tenant_id ?? "")
    .order("name")

  type StoreWithChain = { id: string; name: string; chains: { name: string; color: string } | null }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Legg til ny skjerm"
        subtitle="Generer en registreringskode og bruk den på Raspberry Pi"
        backHref="/admin/screens"
      />
      <div className="flex-1 p-6">
        <NewScreenClient stores={(stores as unknown as StoreWithChain[]) ?? []} />
      </div>
    </div>
  )
}
