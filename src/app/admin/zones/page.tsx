import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { ZonePicker } from "./_components/zone-picker"

export const dynamic = "force-dynamic"

export default async function ZonesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentLayoutId: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single()

    if (profile?.tenant_id) {
      const { data: layout } = await supabase
        .from("zone_layouts")
        .select("name")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_default", true)
        .single()

      currentLayoutId = layout?.name ?? null
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Sone-oppsett"
        subtitle="Velg layout for skjermene dine"
      />
      <div className="flex-1 p-6 max-w-4xl">
        <p className="text-sm text-zinc-500 mb-6">
          Layouten bestemmer hvordan skjermarealet deles inn i soner. Velg den som passer best for butikkenes behov.
          Endringer aktiveres ved neste gjeninnlasting av skjermene.
        </p>
        <ZonePicker currentLayoutId={currentLayoutId} />
      </div>
    </div>
  )
}
