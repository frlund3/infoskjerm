# Superadmin-plattform — Inkrement 1 (tenant-velger / act-as-fundament) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gi `super_admin` en fungerende tenant-velger («opptre som» en tenant) slik at hele det vanlige admin-panelet re-scopes til valgt tenant, med et `/admin/plattform`-skall og en persistent «opptrer som»-banner.

**Architecture:** Cookie-drevet aktiv tenant (`sa_active_tenant`) resolvet i en sentral server-helper `getAdminContext()`. Vanlige admin-queries scopes eksplisitt på `effectiveTenantId` (nødvendig fordi `super_admin` bypasser RLS). RLS-migrasjonene 026/027 røres ikke. Cross-tenant-lesing (tenant-lista) skjer via service-role og er innelukket til superadmin-stier.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase (`@supabase/ssr` + service-role), Vitest (unit), Playwright (e2e), TypeScript strict.

**Kilde:** [docs/specs/2026-07-01-superadmin-plattform-tenant-actas-design.md](../specs/2026-07-01-superadmin-plattform-tenant-actas-design.md)

**Design-raffinement oppdaget under planlegging (avvik fra spec §5.4):**
- En tenant spenner flere chains (EUROSPAR/JOKER/SPAR), så det finnes ingen entydig «tenant-branding». Ved act-as beholdes den nøytrale `super_admin`-branding, og **tenant-identiteten bæres av banneret** i stedet.
- `tenants` har RLS på uten SELECT-policy → tenant-oppslag gjøres via `createAdminClient()` (service-role) **kun** etter at rollen `super_admin` er verifisert fra brukerens egen rad.

---

## File Structure

**Create:**
- `src/lib/admin/admin-context.ts` — `getAdminContext()` + pure `resolveEffectiveTenant()` + cookie-konstant.
- `src/lib/admin/admin-context.test.ts` — unit-tester for `resolveEffectiveTenant()`.
- `src/app/admin/plattform/actions.ts` — `setActiveTenant(id | null)` server action.
- `src/app/admin/plattform/layout.tsx` — vokter `super_admin` (uten å tvinge tenant-valg).
- `src/app/admin/plattform/page.tsx` — tenant-liste med «Opptre som»-knapp.
- `src/components/admin/impersonation-banner.tsx` — banner + «Avslutt».
- `src/lib/admin/tenants.ts` — `listAllTenants()` (service-role) + `getTenantById()`.
- `e2e/act-as.spec.ts` — Playwright act-as-flyt.

**Modify:**
- `src/lib/admin/require-role.ts` — bygg på `getAdminContext()`; returner `effectiveTenantId` + `isImpersonating`; redirect `super_admin` til `/admin/plattform` når ikke i act-as.
- `src/lib/admin/queries.ts` — alle tenant-scopede lese-funksjoner tar `tenantId` og filtrerer eksplisitt.
- `src/app/admin/layout.tsx` — bruk `getAdminContext()`, send `isImpersonating` + `activeTenant` til Sidebar.
- `src/components/admin/sidebar.tsx` — «Plattform»-inngang for `super_admin` + render banner.
- Alle kall-steder for de refaktorerte `queries.ts`-funksjonene (enumereres i Task 7).

---

## Task 1: Pure tenant-resolver + cookie-konstant

**Files:**
- Create: `src/lib/admin/admin-context.ts`
- Test: `src/lib/admin/admin-context.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/admin/admin-context.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveEffectiveTenant, ACTIVE_TENANT_COOKIE } from './admin-context'

describe('resolveEffectiveTenant', () => {
  it('vanlig bruker bruker sin egen tenant og impersonerer ikke', () => {
    expect(resolveEffectiveTenant({
      role: 'store_manager', realTenantId: 't-real', cookieTenantId: 't-other', activeTenantValid: true,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('super_admin med gyldig cookie impersonerer den valgte tenanten', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: 't-x', activeTenantValid: true,
    })).toEqual({ effectiveTenantId: 't-x', isImpersonating: true })
  })

  it('super_admin med ugyldig/arkivert cookie faller tilbake til egen tenant', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: 't-gone', activeTenantValid: false,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('super_admin uten cookie impersonerer ikke', () => {
    expect(resolveEffectiveTenant({
      role: 'super_admin', realTenantId: 't-real', cookieTenantId: null, activeTenantValid: false,
    })).toEqual({ effectiveTenantId: 't-real', isImpersonating: false })
  })

  it('eksporterer cookie-navnet', () => {
    expect(ACTIVE_TENANT_COOKIE).toBe('sa_active_tenant')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/admin-context.test.ts`
Expected: FAIL — `Failed to resolve import './admin-context'`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/admin/admin-context.ts`:
```ts
import { cookies } from "next/headers"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { type UserRole } from "@/lib/roles"

export const ACTIVE_TENANT_COOKIE = "sa_active_tenant"

export interface ActiveTenant {
  id: string
  name: string
  slug: string
}

export interface AdminContext {
  userId: string
  role: UserRole
  realTenantId: string
  effectiveTenantId: string
  isImpersonating: boolean
  activeTenant: ActiveTenant | null
}

/**
 * Ren, testbar kjerne: bestem hvilken tenant alt skal scopes til.
 * Kun super_admin med gyldig aktiv-tenant-cookie impersonerer; alle andre
 * bruker sin egen tenant (RLS scoper dem uansett).
 */
export function resolveEffectiveTenant(args: {
  role: UserRole
  realTenantId: string
  cookieTenantId: string | null
  activeTenantValid: boolean
}): { effectiveTenantId: string; isImpersonating: boolean } {
  const { role, realTenantId, cookieTenantId, activeTenantValid } = args
  if (role === "super_admin" && cookieTenantId && activeTenantValid) {
    return { effectiveTenantId: cookieTenantId, isImpersonating: true }
  }
  return { effectiveTenantId: realTenantId, isImpersonating: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/admin-context.test.ts`
Expected: PASS (5 tester).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/admin-context.ts src/lib/admin/admin-context.test.ts
git commit -m "feat(superadmin): pure tenant-resolver + aktiv-tenant-cookie-konstant"
```

---

## Task 2: `getAdminContext()` server-resolver

**Files:**
- Modify: `src/lib/admin/admin-context.ts`

- [ ] **Step 1: Append `getAdminContext()` to the file**

Legg til nederst i `src/lib/admin/admin-context.ts`:
```ts
/**
 * Full server-side kontekst for admin. Leser innlogget bruker + aktiv-tenant-cookie.
 * Tenant-oppslag for super_admin gjøres via service-role (tenants har RLS uten
 * SELECT-policy), og kun etter at rollen er verifisert fra brukerens egen rad.
 * Returnerer null når ingen er innlogget.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? "store_employee") as UserRole
  const realTenantId = profile?.tenant_id ?? ""

  const cookieStore = await cookies()
  const cookieTenantId =
    role === "super_admin" ? (cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? null) : null

  let activeTenant: ActiveTenant | null = null
  if (role === "super_admin" && cookieTenantId) {
    const admin = createAdminClient()
    const { data } = await admin
      .from("tenants")
      .select("id, name, slug")
      .eq("id", cookieTenantId)
      .maybeSingle()
    activeTenant = data ?? null
  }

  const { effectiveTenantId, isImpersonating } = resolveEffectiveTenant({
    role,
    realTenantId,
    cookieTenantId,
    activeTenantValid: activeTenant !== null,
  })

  return { userId: user.id, role, realTenantId, effectiveTenantId, isImpersonating, activeTenant }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (ingen nye feil). Hvis `createAdminClient` ikke er eksportert fra `@/lib/supabase/server`, verifiser importlinjen mot [src/lib/supabase/server.ts](../../src/lib/supabase/server.ts) (den eksporterer `createAdminClient` og `createClient`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/admin-context.ts
git commit -m "feat(superadmin): getAdminContext() resolver med service-role tenant-oppslag"
```

---

## Task 3: `listAllTenants()` + `getTenantById()` (service-role)

**Files:**
- Create: `src/lib/admin/tenants.ts`

- [ ] **Step 1: Implement**

`src/lib/admin/tenants.ts`:
```ts
import { createAdminClient } from "@/lib/supabase/server"

export interface TenantRow {
  id: string
  name: string
  slug: string
  created_at: string
}

/** Alle tenants på tvers (service-role). Kun for verifiserte super_admin-stier. */
export async function listAllTenants(): Promise<TenantRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, created_at")
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tenants")
    .select("id, name, slug, created_at")
    .eq("id", id)
    .maybeSingle()
  return data ?? null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/tenants.ts
git commit -m "feat(superadmin): service-role tenant-liste-hjelpere"
```

---

## Task 4: `setActiveTenant` server action

**Files:**
- Create: `src/app/admin/plattform/actions.ts`

- [ ] **Step 1: Implement**

`src/app/admin/plattform/actions.ts`:
```ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAdminContext, ACTIVE_TENANT_COOKIE } from "@/lib/admin/admin-context"
import { getTenantById } from "@/lib/admin/tenants"

/**
 * Setter (eller tømmer, ved null) aktiv tenant for en super_admin og redirecter.
 * Ikke-super_admin avvises. Ukjent tenant ignoreres (tømmer cookie).
 */
export async function setActiveTenant(tenantId: string | null): Promise<void> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")

  const cookieStore = await cookies()

  if (tenantId === null) {
    cookieStore.delete(ACTIVE_TENANT_COOKIE)
    redirect("/admin/plattform")
  }

  const tenant = await getTenantById(tenantId)
  if (!tenant) {
    cookieStore.delete(ACTIVE_TENANT_COOKIE)
    redirect("/admin/plattform")
  }

  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
  })
  redirect("/admin")
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/plattform/actions.ts
git commit -m "feat(superadmin): setActiveTenant server action"
```

---

## Task 5: `/admin/plattform`-skall (guard + tenant-liste)

**Files:**
- Create: `src/app/admin/plattform/layout.tsx`
- Create: `src/app/admin/plattform/page.tsx`

- [ ] **Step 1: Layout-guard**

`src/app/admin/plattform/layout.tsx`:
```tsx
import { getAdminContext } from "@/lib/admin/admin-context"
import { redirect } from "next/navigation"

export default async function PlattformLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")
  return <div className="p-6 md:p-10 max-w-5xl mx-auto">{children}</div>
}
```

- [ ] **Step 2: Tenant-liste-side med «Opptre som»**

`src/app/admin/plattform/page.tsx`:
```tsx
import { listAllTenants } from "@/lib/admin/tenants"
import { getAdminContext } from "@/lib/admin/admin-context"
import { setActiveTenant } from "./actions"

export default async function PlattformPage() {
  const ctx = await getAdminContext()
  const tenants = await listAllTenants()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Plattform</h1>
      <p className="text-zinc-500 mb-6">Velg en kunde-organisasjon å opptre som.</p>
      <ul className="space-y-2">
        {tenants.map((t) => {
          const isActive = ctx?.activeTenant?.id === t.id
          return (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{t.name}</p>
                <p className="text-xs text-zinc-400 truncate">{t.slug}</p>
              </div>
              <form action={setActiveTenant.bind(null, t.id)}>
                <button
                  type="submit"
                  className="text-sm font-medium rounded-lg px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
                  disabled={isActive}
                >
                  {isActive ? "Aktiv" : "Opptre som"}
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Type-check + manual smoke**

Run: `npx tsc --noEmit`
Expected: PASS.
Manuelt (senere, etter Task 6-8): logg inn som super_admin → `/admin/plattform` viser tenant-lista.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/plattform/layout.tsx src/app/admin/plattform/page.tsx
git commit -m "feat(superadmin): /admin/plattform-skall med tenant-liste og opptre-som"
```

---

## Task 6: Refaktorer `requireRole` til effektiv tenant + tvunget valg

**Files:**
- Modify: `src/lib/admin/require-role.ts`

- [ ] **Step 1: Erstatt filinnholdet**

`src/lib/admin/require-role.ts` (full erstatning):
```ts
import { createClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { redirect } from "next/navigation"
import { type UserRole } from "@/lib/roles"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Vokter en vanlig admin-rute. `tenantId` er den EFFEKTIVE tenanten (aktiv tenant
 * når super_admin opptrer som en). En super_admin som ikke har valgt tenant sendes
 * til /admin/plattform for å velge først.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ supabase: SupabaseClient; userId: string; role: UserRole; tenantId: string; isImpersonating: boolean }> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")

  if (!allowedRoles.includes(ctx.role)) {
    redirect("/admin")
  }

  if (ctx.role === "super_admin" && !ctx.isImpersonating) {
    redirect("/admin/plattform")
  }

  const supabase = await createClient()
  return {
    supabase,
    userId: ctx.userId,
    role: ctx.role,
    tenantId: ctx.effectiveTenantId,
    isImpersonating: ctx.isImpersonating,
  }
}

/** Vokter superadmin-plattformseksjonen uten å tvinge tenant-valg. */
export async function requireSuperAdmin(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")
  const supabase = await createClient()
  return { supabase, userId: ctx.userId }
}
```

- [ ] **Step 2: Type-check (forvent midlertidige feil i kall-steder)**

Run: `npx tsc --noEmit`
Expected: PASS for `require-role.ts` selv. Eksisterende kall til `requireRole` som destrukturerer `{ tenantId }` fungerer fortsatt (feltet finnes). Nye felt (`isImpersonating`) er valgfrie å bruke. Ingen bruddendring i signatur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/require-role.ts
git commit -m "feat(superadmin): requireRole gir effektiv tenant + tvinger tenant-valg for super_admin"
```

---

## Task 7: Scoping-refaktor av `queries.ts` + kall-steder

**Files:**
- Modify: `src/lib/admin/queries.ts`
- Modify: alle kall-steder (enumereres i Step 1)

**Mønster:** hver tenant-scopet lese-funksjon tar et nytt `tenantId: string`-argument og legger på eksplisitt filter. For funksjoner som spør `chains` (som har `tenant_id`) filtreres på `chains.tenant_id`; for funksjoner som spør en tabell med egen `tenant_id`-kolonne filtreres direkte.

- [ ] **Step 1: Enumerer kall-steder**

Run:
```bash
grep -rn "getStoresBoard\|getStoresGroupedByChain\|getAllTags\|getTagsWithStores\|getUsersWithDetails\|getContentItems\|getAllContentItems\|getPlaylistsWithItems\|getPendingContent\|getScreensWithStore\|getChainOverview\|getAdminStats" src/app --include=*.tsx --include=*.ts
```
Noter hver fil + linje. Hvert treff må oppdateres i Step 3.

- [ ] **Step 2: Legg til `tenantId`-param + filter i `queries.ts`**

I `src/lib/admin/queries.ts`, endre hver funksjon under. Vist med før→etter (kun signatur + query-kjede endres):

`getAdminStats` — legg `.eq('tenant_id', tenantId)` på alle fire delspørringene:
```ts
export async function getAdminStats(supabase: AdminSupabase, tenantId: string): Promise<AdminStats> {
  const [screensResult, pendingResult, storesResult, liveResult] = await Promise.all([
    supabase.from('screens').select('id, last_heartbeat, status').eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending_approval'),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'live'),
  ])
  // resten uendret
```

`getChainOverview`, `getStoresGroupedByChain`, `getStoresBoard` — filtrer på `chains.tenant_id`:
```ts
export async function getChainOverview(supabase: AdminSupabase, tenantId: string): Promise<ChainOverviewItem[]> {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, screens(id, status, last_heartbeat))')
    .eq('tenant_id', tenantId)
    .order('name')
  // resten uendret
```
```ts
export async function getStoresGroupedByChain(supabase: AdminSupabase, tenantId: string) {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, name, company_name, city, email, org_number, gln, screens(id))')
    .eq('tenant_id', tenantId)
    .order('name')
  return chains ?? []
}
```
```ts
export async function getStoresBoard(supabase: AdminSupabase, tenantId: string) {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, name, company_name, city, email, org_number, gln, screens(id), store_tags(tags(id, name, color)))')
    .eq('tenant_id', tenantId)
    .order('name')
  return chains ?? []
}
```

`getScreensWithStore`, `getAllTags`, `getTagsWithStores`, `getUsersWithDetails`, `getContentItems`, `getAllContentItems`, `getPlaylistsWithItems`, `getPendingContent` — legg `.eq('tenant_id', tenantId)` på hoved-`from()`:
```ts
export async function getScreensWithStore(supabase: AdminSupabase, tenantId: string) {
  const { data, error } = await supabase
    .from('screens')
    .select(`id, name, token, status, last_heartbeat, last_seen_at, app_info, pending_command, power_state, stores(id, name, chains(id, name, color))`)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getAllTags(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase.from('tags').select('id, name, color').eq('tenant_id', tenantId).order('name')
  return data ?? []
}

export async function getTagsWithStores(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase.from('tags').select('id, name, color, store_tags(stores(id, name))').eq('tenant_id', tenantId).order('name')
  return data ?? []
}

export async function getUsersWithDetails(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('users')
    .select(`id, email, full_name, role, chains(id, name, color), user_stores(stores(id, name))`)
    .eq('tenant_id', tenantId)
    .order('full_name')
  return data ?? []
}

export async function getContentItems(supabase: AdminSupabase, tenantId: string, type: Database['public']['Enums']['content_type']) {
  const { data } = await supabase
    .from('content_items')
    .select(`id, title, status, type, created_at, valid_from, valid_to, users!created_by(full_name)`)
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getAllContentItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`id, title, status, type, created_at, valid_from, valid_to, users!created_by(full_name)`)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPlaylistsWithItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('playlists')
    .select(`id, name, playlist_items(id, position, duration_seconds, content_items(id, title, type))`)
    .eq('tenant_id', tenantId)
    .order('name')
  return data ?? []
}

export async function getPendingContent(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`id, title, type, status, created_at, users!created_by(full_name)`)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })
  return data ?? []
}
```

> Verifiser at hver av disse tabellene (`playlists`, `tags`, `screens`, `content_items`, `stores`, `users`, `chains`) har en `tenant_id`-kolonne i [src/types/database.ts](../../src/types/database.ts). Alle skal ha den (tenant-isolasjon). Hvis en mangler, stopp og rapporter — ikke gjett.

- [ ] **Step 3: Oppdater hvert kall-sted fra Step 1**

For hver fil fra grep-resultatet: kall-stedet henter allerede `tenantId` fra `requireRole(...)`. Send den inn. Worked example — en side som i dag har:
```tsx
const { supabase } = await requireRole([...])
const board = await getStoresBoard(supabase)
```
endres til:
```tsx
const { supabase, tenantId } = await requireRole([...])
const board = await getStoresBoard(supabase, tenantId)
```
`getContentItems` tar `tenantId` FØR `type`: `getContentItems(supabase, tenantId, "news")`.

Hvis et kall-sted ikke allerede henter `tenantId` fra `requireRole`, legg det til i destruktureringen.

- [ ] **Step 4: Type-check fanger utelatte kall-steder**

Run: `npx tsc --noEmit`
Expected: Feil av typen «Expected 2 arguments, but got 1» på hvert kall-sted du ikke har oppdatert. Fiks til PASS. Dette er sikkerhetsnettet: typesystemet garanterer at ingen scopet query kalles uten tenant.

- [ ] **Step 5: Kjør eksisterende tester**

Run: `npx vitest run`
Expected: PASS (eksisterende `queries.test.ts` tester rene util-funksjoner, upåvirket).

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/queries.ts src/app
git commit -m "feat(superadmin): eksplisitt tenant-scoping av admin-queries (act-as)"
```

---

## Task 8: Impersoneringsbanner + sidebar-integrasjon

**Files:**
- Create: `src/components/admin/impersonation-banner.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/admin/sidebar.tsx`

- [ ] **Step 1: Banner-komponent**

`src/components/admin/impersonation-banner.tsx`:
```tsx
"use client"

import { setActiveTenant } from "@/app/admin/plattform/actions"
import { LogOut } from "lucide-react"

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="mx-2 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Opptrer som</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-amber-900 truncate">{tenantName}</span>
        <form action={setActiveTenant.bind(null, null)}>
          <button
            type="submit"
            className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900"
            title="Avslutt"
          >
            <LogOut className="w-3 h-3" /> Avslutt
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Send kontekst inn i Sidebar via layout**

I `src/app/admin/layout.tsx`, erstatt data-henting (linje 17-25) og `navUser`-objektet slik at det bruker `getAdminContext()`. Legg til import øverst:
```tsx
import { getAdminContext } from "@/lib/admin/admin-context"
```
Etter `if (!user) redirect("/login")`, legg til:
```tsx
  const ctx = await getAdminContext()
```
Behold eksisterende `profile`/`chain`-henting for branding. Utvid `navUser` med to felt:
```tsx
          const navUser = {
            email: user.email ?? "",
            fullName: profile?.full_name ?? "Admin",
            role,
            chainName: chain?.name ?? null,
            chainColor: chain?.color ?? null,
            isImpersonating: ctx?.isImpersonating ?? false,
            activeTenantName: ctx?.activeTenant?.name ?? null,
          }
```

- [ ] **Step 3: Utvid Sidebar-props + render banner + Plattform-inngang**

I `src/components/admin/sidebar.tsx`:

Legg til import øverst:
```tsx
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { LayoutGrid } from "lucide-react"
```
Utvid `SidebarProps.user` med:
```tsx
    isImpersonating: boolean
    activeTenantName: string | null
```
Rett under `<nav ...>` åpningen (før `{navGroups.map(...)}`), legg til Plattform-inngang for super_admin:
```tsx
        {role === "super_admin" && (
          <div className="mb-4">
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/admin/plattform"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                    pathname.startsWith("/admin/plattform")
                      ? "font-semibold text-white"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  )}
                  style={pathname.startsWith("/admin/plattform") ? { backgroundColor: "var(--brand-primary)" } : undefined}
                >
                  <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">Plattform</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
```
Rett over «User footer»-blokken (`<div className="px-3 py-3 border-t ...">`), legg til:
```tsx
      {user.isImpersonating && user.activeTenantName && (
        <ImpersonationBanner tenantName={user.activeTenantName} />
      )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. `MobileNav`-props må også få de to nye feltene — oppdater `MobileNavProps.user` i [src/components/admin/mobile-nav.tsx](../../src/components/admin/mobile-nav.tsx) med `isImpersonating: boolean` og `activeTenantName: string | null` (samme som SidebarProps), siden layout sender ett `navUser`-objekt til begge. Fiks til PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/impersonation-banner.tsx src/components/admin/sidebar.tsx src/components/admin/mobile-nav.tsx src/app/admin/layout.tsx
git commit -m "feat(superadmin): impersoneringsbanner + Plattform-inngang i sidebar"
```

---

## Task 9: E2E — act-as-flyt

**Files:**
- Create: `e2e/act-as.spec.ts`

> Forutsetning: sjekk hvordan eksisterende Playwright-tester logger inn (se `e2e/`-mappa / `playwright.config.ts` for baseURL og evt. auth-helper/`storageState`). Gjenbruk samme innloggingsmønster som en eksisterende spec. Testen trenger en super_admin-bruker; bruk samme test-credential-mekanisme som repoets øvrige e2e-tester.

- [ ] **Step 1: Skriv testen**

`e2e/act-as.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

// Bruk repoets eksisterende innloggings-helper/storageState for en super_admin.
// (Erstatt loginAsSuperAdmin med mønsteret fra en eksisterende e2e-spec.)

test('super_admin tvinges til plattform og kan opptre som en tenant', async ({ page }) => {
  await page.goto('/admin')
  // Uten aktiv tenant redirectes super_admin til plattform:
  await expect(page).toHaveURL(/\/admin\/plattform/)
  await expect(page.getByRole('heading', { name: 'Plattform' })).toBeVisible()

  // Opptre som første tenant:
  await page.getByRole('button', { name: 'Opptre som' }).first().click()
  await expect(page).toHaveURL(/\/admin(\/|$)/)

  // Banneret vises:
  await expect(page.getByText('Opptrer som')).toBeVisible()

  // Avslutt tar oss tilbake til plattform:
  await page.getByRole('button', { name: 'Avslutt' }).click()
  await expect(page).toHaveURL(/\/admin\/plattform/)
})
```

- [ ] **Step 2: Kjør e2e**

Run: `npx playwright test e2e/act-as.spec.ts`
Expected: PASS. Ved feil på innlogging: juster auth-helper til å matche eksisterende specs (ikke skru av testen).

- [ ] **Step 3: Commit**

```bash
git add e2e/act-as.spec.ts
git commit -m "test(superadmin): e2e for act-as-flyt (velg tenant, banner, avslutt)"
```

---

## Task 10: Full verifisering

- [ ] **Step 1: Lint + typer + unit + build**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run lint && npm run build
```
Expected: alt grønt.

- [ ] **Step 2: Manuell røyk-test (dev)**

Start `npm run dev` på egen port (annen agent kan kjøre :3000 — se minnet om stale dev-server). Verifiser:
1. super_admin → `/admin` redirecter til `/admin/plattform`.
2. «Opptre som» → tilbake til `/admin`, banner viser tenant-navn (desktop OG mobil-drawer).
3. Innholds-/butikk-/skjerm-lister viser data for valgt tenant.
4. «Avslutt» → tilbake til plattform, banner borte.
5. En vanlig (ikke-super) bruker ser INGEN endring: ingen Plattform-inngang, intet banner, samme data som før.

- [ ] **Step 3: Commit (hvis små justeringer)**

```bash
git add -A -- src/ e2e/ docs/
git commit -m "chore(superadmin): verifisering + justeringer inkrement 1"
```
> Merk: `git add -A -- src/ e2e/ docs/` er scopet til egne mapper. IKKE `git add -A` på hele treet (unngå å dra inn andres WIP: `.claude/settings.json`, `docs/oppsett-raspberrypi.md`, `scripts/setup/`).

---

## Self-Review (utført)

- **Spec-dekning:** Act-as (§5.2) → Task 1,2,4,6. Plattform-skall (§5.1) → Task 5. Scoping (§5.3) → Task 7. Sidebar/mobil/banner (§5.4) → Task 8. Tvunget valg (§5.2) → Task 6. Testing (§8) → Task 1,9,10. Skjema/livssyklus (§5.5) og dashboard/drift (§5.6, §6) er bevisst utenfor inkrement 1 (inkrement 2-4).
- **Placeholders:** ingen TBD/TODO; hver kode-step har faktisk kode. Kall-steds-oppdateringen (Task 7 Step 3) bruker grep-enumerering + type-sjekk som sikkerhetsnett i stedet for å pre-skrive ~15 diff-er som kan drifte — bevisst og eksekverbart valg.
- **Type-konsistens:** `getAdminContext()`/`AdminContext`/`resolveEffectiveTenant` brukes med samme felt overalt; `requireRole` returnerer fortsatt `tenantId` (nå effektiv) så eksisterende destrukturering ikke brekker; `setActiveTenant` importeres likt i banner og plattform-side.
- **Grener/isolasjon:** all commit scopes til egne filer; eksplisitt advarsel mot `git add -A` på hele treet.
