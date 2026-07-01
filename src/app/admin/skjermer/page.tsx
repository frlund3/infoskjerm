import { requireRole } from "@/lib/admin/require-role"
import { getStoresBoard } from "@/lib/admin/queries"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { Topbar } from "@/components/admin/topbar"
import { SkjermerBoard, type BoardStore } from "./skjermer-board"
import { ScreenAssignment, type ScreenRow } from "../stores/[id]/screen-assignment"
import { getBaseUrl } from "@/lib/base-url"

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

  // Kiosk-passord-status per butikk (kun boolean til klienten — aldri hashen).
  // kiosk_password_hash (031) er ikke i den genererte typen → cast. RLS scoper
  // radene til brukerens egne enheter.
  const { data: kioskRows } = await (supabase.from("stores") as unknown as {
    select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: { id: string; kiosk_password_hash: string | null }[] | null }> }
  }).select("id, kiosk_password_hash").eq("tenant_id", tenantId)
  const protectedStores = new Set((kioskRows ?? []).filter((r) => r.kiosk_password_hash).map((r) => r.id))

  const boardStores: BoardStore[] = stores.map((s) => ({
    ...s,
    screens: byStore.get(s.id) ?? [],
    hasKioskPassword: protectedStores.has(s.id),
  }))

  const total = boardStores.reduce((n, s) => n + s.screens.length, 0)
  const online = boardStores.reduce((n, s) => n + s.screens.filter((x) => x.online).length, 0)

  // Våre screens-rader (enhets-styring: token + flate/avdeling/orientering).
  const { data: assignRows } = await supabase
    .from("screens")
    .select("id, name, token, flate, avdeling, orientation, store_id")
    .order("name")
  const rows = (assignRows ?? []) as unknown as (ScreenRow & { store_id: string })[]
  const rowsByStore = new Map<string, ScreenRow[]>()
  for (const r of rows) {
    const list = rowsByStore.get(r.store_id) ?? []
    list.push(r)
    rowsByStore.set(r.store_id, list)
  }
  const assignable = stores
    .filter((s) => (rowsByStore.get(s.id)?.length ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "nb"))
  const origin = await getBaseUrl()

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Skjermer" subtitle={`${total} skjermer i drift · ${online} pålogget`} />
      <div className="flex-1 p-6 max-w-7xl space-y-8">
        <SkjermerBoard stores={boardStores} />

        {assignable.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Enhets-tildeling</h2>
              <p className="text-sm text-zinc-500">Velg hva hver skjerm viser — kunde/intern, avdeling og orientering. Endringen slår gjennom på Pi-en automatisk; du trenger aldri røre den.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {assignable.map((s) => (
                <div key={s.id} className="rounded-2xl border border-zinc-100 bg-white">
                  <div className="px-5 pt-4 -mb-2 text-sm font-semibold text-zinc-900">{s.name}</div>
                  <ScreenAssignment screens={rowsByStore.get(s.id) ?? []} origin={origin} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
