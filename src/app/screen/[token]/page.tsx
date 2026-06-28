import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ScreenDisplay } from "@/components/screen/screen-display"

export default async function ScreenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = await createClient()

  const { data: screen, error } = await supabase
    .from("screens")
    .select(`
      id, name, store_id, status,
      stores(name, chains(color, brand_fg), tenants(name))
    `)
    .eq("token", token)
    .eq("status", "active")
    .single()

  if (error || !screen) {
    notFound()
  }

  type StoreData = {
    name: string
    chains: { color: string; brand_fg: string | null } | null
    tenants: { name: string } | null
  }
  const store = screen.stores as StoreData | null
  const chain = store?.chains ?? null
  const tenant = store?.tenants ?? null

  // Update last_seen_at (fire-and-forget)
  supabase
    .from("screens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", screen.id)
    .then(() => {})

  return (
    <ScreenDisplay
      token={token}
      screenId={screen.id}
      storeId={screen.store_id ?? undefined}
      chainName={tenant?.name ?? "Infoskjerm"}
      storeName={store?.name ?? undefined}
      brandPrimary={chain?.color ?? undefined}
      brandFg={chain?.brand_fg ?? undefined}
    />
  )
}
