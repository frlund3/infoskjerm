import { requireRole } from "@/lib/admin/require-role"
import { getStoresBoard } from "@/lib/admin/queries"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { Topbar } from "@/components/admin/topbar"
import { SkjermerBoard, type BoardStore } from "./skjermer-board"

/**
 * Fleet overview: every store and the real screens assigned to it, grouped and
 * coloured by role (kunde / bakrom / avdeling), with live online status, last-seen
 * and the layout each player reports showing. Read straight from the engine (Xibo)
 * via fetchScreensByStore, so it's truthful. Client board adds role filtering.
 */

export const dynamic = "force-dynamic"

interface RawStore {
  id: string
  name: string
}

export default async function SkjermerPage() {
  const { supabase, tenantId } = await requireRole([
    "super_admin",
    "chain_manager",
    "area_manager",
    "store_manager",
  ])
  const chains = await getStoresBoard(supabase, tenantId)

  const stores = chains.flatMap((c) =>
    ((c.stores as unknown as RawStore[]) ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      chainName: c.name as string,
      chainColor: (c.color as string | null) ?? "#9ca3af",
    }))
  )
  const byStore = await fetchScreensByStore(stores.map((s) => ({ id: s.id, name: s.name })))
  const boardStores: BoardStore[] = stores.map((s) => ({ ...s, screens: byStore.get(s.id) ?? [] }))

  const total = boardStores.reduce((n, s) => n + s.screens.length, 0)
  const online = boardStores.reduce((n, s) => n + s.screens.filter((x) => x.online).length, 0)

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Skjermer" subtitle={`${total} skjermer i drift · ${online} pålogget`} />
      <div className="flex-1 p-6 max-w-7xl">
        <SkjermerBoard stores={boardStores} />
      </div>
    </div>
  )
}
