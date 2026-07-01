import { requireRole } from "@/lib/admin/require-role"
import { getStoresBoard } from "@/lib/admin/queries"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { Topbar } from "@/components/admin/topbar"
import { SkjermerBoard, type BoardStore } from "./skjermer-board"
import { StoreScreens, type DisplayLite, type ScreenRowLite } from "./store-screens"
import { SkjermerTabs } from "./skjermer-tabs"
import { getBaseUrl } from "@/lib/base-url"

/**
 * Skjermer = enhets-styring. To lag:
 *  1) Status-oversikt (SkjermerBoard): alle butikker og deres Xibo-skjermer, lest
 *     live fra motoren — hvem er pålogget, hva viser de.
 *  2) Skjerm-styring (StoreScreens per butikk med skjermer): bind hver tilkoblede
 *     skjerm til flate/avdeling/orientering, eller legg til kiosk-skjermer.
 *
 * Butikker uten skjerm styres fra butikksiden (StoreScreens har «+ kiosk» der).
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
  const { data: kioskRows } = await (supabase.from("stores") as unknown as {
    select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: { id: string; kiosk_password_hash: string | null }[] | null }> }
  }).select("id, kiosk_password_hash").eq("tenant_id", tenantId)
  const protectedStores = new Set((kioskRows ?? []).filter((r) => r.kiosk_password_hash).map((r) => r.id))

  const boardStores: BoardStore[] = stores.map((s) => ({
    ...s,
    screens: byStore.get(s.id) ?? [],
    hasKioskPassword: protectedStores.has(s.id),
  }))

  // Våre screens-rader (enhets-styring: token + flate/avdeling/orientering + xibo-binding).
  const { data: assignRows } = await supabase
    .from("screens")
    .select("id, token, flate, avdeling, orientation, store_id, xibo_display_id")
    .order("name")
  const rows = (assignRows ?? []) as unknown as (ScreenRowLite & { store_id: string })[]
  const rowsByStore = new Map<string, ScreenRowLite[]>()
  for (const r of rows) {
    const list = rowsByStore.get(r.store_id) ?? []
    list.push(r)
    rowsByStore.set(r.store_id, list)
  }

  // Fysiske Xibo-skjermer → DisplayLite per butikk.
  const displaysByStore = new Map<string, DisplayLite[]>()
  for (const [storeId, screens] of byStore.entries()) {
    displaysByStore.set(storeId, screens.map((s) => ({
      displayId: s.displayId,
      name: s.name,
      online: s.online,
      lastSeen: s.lastSeen,
      role: s.role,
      currentLayout: s.currentLayout,
    })))
  }

  // Butikker som har noe å styre (tilkoblet skjerm eller kiosk-rad).
  const managed = stores
    .filter((s) => (displaysByStore.get(s.id)?.length ?? 0) > 0 || (rowsByStore.get(s.id)?.length ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "nb"))

  const totalScreens = stores.reduce((n, s) => n + (displaysByStore.get(s.id)?.length ?? 0) + (rowsByStore.get(s.id)?.filter((r) => r.xibo_display_id == null).length ?? 0), 0)
  const online = boardStores.reduce((n, s) => n + s.screens.filter((x) => x.online).length, 0)
  const origin = await getBaseUrl()

  const styringPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Bind hver tilkoblede skjerm til flate, avdeling og orientering — eller legg til en kiosk-skjerm (telefon/nettbrett). Endringen slår gjennom av seg selv; du rører aldri enheten.</p>
      {managed.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Ingen tilkoblede skjermer ennå. Koble til en Raspberry Pi i skjermsystemet (den dukker opp her automatisk), eller åpne en butikk for å legge til en kiosk-skjerm.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {managed.map((s) => (
            <div key={s.id} className="rounded-2xl border border-zinc-100 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.chainColor }} />
                <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                <span className="text-xs text-zinc-400">{s.chainName}</span>
              </div>
              <StoreScreens
                storeId={s.id}
                displays={displaysByStore.get(s.id) ?? []}
                rows={rowsByStore.get(s.id) ?? []}
                origin={origin}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const statusPanel = (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">Live status fra skjermsystemet. Åpne en butikk for å legge til en kiosk-skjerm.</p>
      <SkjermerBoard stores={boardStores} />
    </div>
  )

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Skjermer" subtitle={`${totalScreens} skjermer · ${online} pålogget`} />
      <div className="flex-1 p-6 max-w-7xl">
        <SkjermerTabs
          styring={styringPanel}
          status={statusPanel}
          styringCount={managed.length}
          statusCount={stores.length}
        />
      </div>
    </div>
  )
}
