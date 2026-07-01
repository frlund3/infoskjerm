# Superadmin-plattform + tenant act-as — design

- **Dato:** 2026-07-01
- **Status:** Godkjent design (klar for implementasjonsplan)
- **Gren:** `feat/superadmin-plattform`
- **Kilde:** Brainstorming-runde med Frank Lunde

> Merk: Denne spec-en ligger i `docs/specs/`, **ikke** `docs/superpowers/`. Sistnevnte
> inneholder forlatt arkitektur (datert 2026-06-28) som per `AGENTS.md` skal ignoreres.

---

## 1. Problem

Systemet er allerede multi-tenant (én Supabase-base, isolasjon via `tenant_id` + RLS), og
rollen `super_admin` finnes og bypasser RLS. Men det finnes **ingen UI** for en superadmin til å:

1. veksle mellom tenants (kunde-organisasjoner), eller
2. få oversikt/kontroll over tenants på tvers.

I dag utledes hele admin-konteksten fra den innloggede brukerens egen `users`-rad
([`src/app/admin/layout.tsx:17-25`](../../src/app/admin/layout.tsx)). En superadmin ser derfor
alle tenants' data blandet sammen i de vanlige listene (RLS scoper dem ikke), med kun et
client-side `Alle butikker`-filter som hjelp. Det finnes ingen «opptre som tenant X»-modus og
ingen dedikert superadmin-flate.

## 2. Mål

En superadmin-plattform på **tenant-nivå** (kunde-organisasjoner) med:

- **Act-as / tenant-veksler:** velg en tenant og «hopp inn i» den — hele det vanlige
  admin-panelet re-scopes, akkurat som en `chain_manager` i den org-en ville sett.
- **Oversikts-dashboard** på tvers av alle tenants.
- **Bruker/tilgang-styring** på tvers.
- **Skjerm/drift-status** på tvers (live fra Xibo).
- **Full tenant-livssyklus:** opprett, rediger, suspender, arkiver.

Virker på både desktop og mobil (mobilnavet gjenbruker `<Sidebar>`).

## 3. Ikke-mål (YAGNI)

- Ingen endring av RLS-migrasjonene 026/027 (butikk-isolasjon holdes urørt).
- Ingen separat native mobil-app (finnes ikke i repoet).
- Ingen hard-delete av tenant-data (arkivering er soft-state).
- Ingen fakturering/billing-flate.

## 4. Valgt tilnærming: C — Hybrid

Cookie-drevet aktiv tenant + sentralisert data-tilgangslag i app-laget, **RLS urørt**, og en
egen `super_admin`-only plattform-seksjon som er eneste sted som leser på tvers av tenants.

**Hvorfor ikke RLS-nivå-impersonering (alternativ B):** ville endret de sensitive
isolasjons-policyene (026/027) og er vanskelig mot Supabase connection-pooling. Risikoen mot
den herdede butikk-isolasjonen er ikke verdt det.

### Kritisk premiss

`super_admin` **bypasser RLS og ser alle tenants**. Derfor kan act-as-scopingen for superadmin
**ikke** hvile på RLS — den må skje eksplisitt i app-laget. Vanlige (ikke-super) brukere er
fortsatt scopet av RLS og påvirkes ikke.

## 5. Arkitektur

### 5.1 Ny seksjon: `/admin/plattform` (kun `super_admin`)

| Rute | Formål |
|------|--------|
| `/admin/plattform` | Dashboard: oversikt på tvers av alle tenants |
| `/admin/plattform/tenants` | Liste + livssyklus (opprett / rediger / suspender / arkiver) |
| `/admin/plattform/tenants/[id]` | Tenant-detalj + «Opptre som»-knapp |
| `/admin/plattform/brukere` | Bruker/tilgang på tvers av alle tenants |
| `/admin/plattform/skjermer` | Skjerm/drift-status på tvers (live fra Xibo) |

Egen `layout.tsx` under `/admin/plattform` som vokter `super_admin` (redirect ellers).
**Cross-tenant-lesing er innelukket til denne seksjonen.**

### 5.2 Act-as-mekanisme

- **Cookie:** `sa_active_tenant` (httpOnly, path `/admin`) — inneholder valgt tenant-id.
  Kun meningsfull for `super_admin`; ignoreres for andre roller.
- **Sentral helper `getAdminContext()`** — ny fil `src/lib/admin/admin-context.ts`. Returnerer:

  ```ts
  interface AdminContext {
    userId: string
    role: UserRole
    effectiveTenantId: string        // tenant alt scopes til
    isImpersonating: boolean         // true når super_admin har valgt tenant
    activeTenant: { id: string; name: string; slug: string } | null
    chain: { name: string; color: string; brand_light: string | null; brand_fg: string | null } | null
  }
  ```

  Regler:
  - **Vanlig bruker:** `effectiveTenantId = users.tenant_id`, `isImpersonating = false`.
  - **super_admin MED cookie:** `effectiveTenantId = valgt tenant`, `isImpersonating = true`.
  - **super_admin UTEN cookie:** ingen aktiv tenant → de vanlige admin-rutene redirecter til
    `/admin/plattform` (tvunget tenant-valg).
- **Server-action `setActiveTenant(id | null)`** — setter/tømmer cookien, revaliderer og
  redirecter. Validerer at tenant finnes og ikke er `archived`.

### 5.3 Scoping-refaktor (mest invasive, men mekanisk avgrenset)

De vanlige admin-queriene og server-actionsene sourcer `tenant_id` fra
`getAdminContext().effectiveTenantId` i stedet for fra brukerprofilen, og legger **eksplisitt**
`.eq("tenant_id", effectiveTenantId)` også på **lese**-queries.

- **Lese:** legg til eksplisitt tenant-filter. For vanlige brukere matcher dette RLS (harmløst);
  for superadmin er det det som faktisk scoper.
- **Skrive (insert):** sett `tenant_id: effectiveTenantId` (samme mønster som i dag, men kilde
  = context, ikke brukerprofil).
- **Skrive (update/delete):** legg til `.eq("tenant_id", effectiveTenantId)`-guard.

Berørte filer (kartlagt):
- `src/app/admin/_lib/queries.ts` (bl.a. `getStoresBoard`, `getAllContentItems`, `getContentItems`)
- `src/app/admin/innhold/actions.ts`
- `src/app/admin/kundeinnhold/*` (samme mønster)
- `src/app/admin/stores/actions.ts`
- `src/app/admin/users/actions.ts`
- `src/app/admin/skjermer/page.tsx`

### 5.4 Sidebar, mobil og branding

- [`src/components/admin/sidebar.tsx`](../../src/components/admin/sidebar.tsx):
  - Ny «Plattform»-inngang synlig kun for `super_admin`.
  - Persistent banner **«Opptrer som «{tenantnavn}» · Avslutt»** når `isImpersonating` — «Avslutt»
    kaller `setActiveTenant(null)`.
  - Ny komponent `src/components/admin/impersonation-banner.tsx`.
- [`src/components/admin/mobile-nav.tsx`](../../src/components/admin/mobile-nav.tsx) gjenbruker
  `<Sidebar>`, så veksler + banner virker på mobil uten ekstra arbeid.
- [`src/app/admin/layout.tsx`](../../src/app/admin/layout.tsx) bruker `getAdminContext()` og
  henter branding (chain-farge/navn) fra **aktiv tenant** når superadmin opptrer som den.

### 5.5 Skjema + livssyklus (migrasjon 028)

- `tenants.status` — enum/text `active | suspended | archived`, default `active`.
- `tenants.archived_at` — timestamptz, nullable.
- RLS-policy som lar `super_admin` INSERT/UPDATE på `tenants`.
- Auth/layout-guard: brukere i en `suspended`/`archived` tenant blokkeres fra innlogging/admin
  (superadmin upåvirket).
- Opprett tenant + første `chain_manager`: gjenbruk `createAdminClient()` (service-role,
  [`src/lib/supabase/server.ts:7`](../../src/lib/supabase/server.ts)) og invitasjons-flyten i
  [`src/app/admin/users/actions.ts`](../../src/app/admin/users/actions.ts).

### 5.6 Drift-status på tvers

- Dashboard: rask status fra Supabase (`screens.last_heartbeat` / `screens.last_seen_at`) —
  ingen tunge kall.
- Detalj: live fra Xibo via eksisterende `fetchScreensByStore()`
  ([`src/lib/xibo/screens.ts`](../../src/lib/xibo/screens.ts)). Xibo-kall er tunge → holdes til
  detalj-nivå, ikke i dashboard-aggregatet.

## 6. Dataflyt (act-as happy path)

1. Superadmin logger inn → `layout` resolver context → ingen aktiv tenant → redirect til
   `/admin/plattform`.
2. Åpner en tenant → detaljside → «Opptre som» → `setActiveTenant(id)` setter cookie →
   redirect til `/admin`.
3. Persistent banner: «Opptrer som «Gange-Rolv AS» · Avslutt».
4. Alle vanlige admin-queries leser `effectiveTenantId` fra context og scoper korrekt.
5. «Avslutt» → `setActiveTenant(null)` → tilbake til plattform.

## 7. Feilhåndtering

- `/admin/plattform/*`: redirect/403 hvis ikke `super_admin`.
- Cookie-validering: tenant må finnes og ikke være `archived`; ellers tøm cookie.
- Superadmin mister `super_admin`-rolle midt i økten → cookie ignoreres.
- Impersonert tenant arkiveres midt i økten → fall tilbake til plattform.
- Manglende `SUPABASE_SERVICE_ROLE_KEY` ved tenant-opprettelse → tydelig feilmelding
  (`createAdminClient()` kaster allerede).

## 8. Testing

Per web-testing-reglene:
- **Unit:** `getAdminContext()` (alle tre rolle/cookie-grener), `setActiveTenant`-validering.
- **Integrasjon/RLS-regresjon:** verifiser at en `chain_manager`/`store_manager` fortsatt **ikke**
  ser andre tenants (026/027 urørt), og at superadmin-scoping gir riktig delmengde.
- **E2E (Playwright):** act-as-flyten (velg tenant → banner → avslutt), plattform-guard
  (ikke-super blir avvist), tenant-livssyklus.
- **Visuell regresjon:** dashboard på 320/768/1024/1440 + mobil-drawer med banner.

## 9. Implementasjon i 4 inkrementer

Hver får egen spec→plan→implementasjon-runde. **Inkrement 1 bygges først** (leverer
tenant-velgeren = kjernebehovet).

1. **Fundament (tenant-velger):** `getAdminContext()`, cookie, `setActiveTenant`, act-as-veksler
   + banner i sidebar, `/admin/plattform`-skall med guard, tvunget tenant-valg for superadmin,
   scoping-refaktoren. *Dette alene gir «veksle mellom tenants».*
2. **Dashboard:** cross-tenant oversikt (tenants → #butikker, #skjermer online/offline, #brukere,
   #innhold, status).
3. **Tenant-livssyklus:** migrasjon 028 + opprett/rediger/suspender/arkiver + service-role + guard.
4. **Brukere & skjermer/drift på tvers:** cross-tenant bruker/tilgang + live Xibo drift-status.

## 10. Åpne avklaringer (besluttet)

- Tenant-nivå (kunde-org), ikke butikk-nivå. ✅
- Full livssyklus (opprett/rediger/suspender/arkiver). ✅
- Act-as = «opptre som» (ikke bare read-only detaljside). ✅
- Tilnærming C (hybrid, RLS urørt). ✅
- Superadmin tvinges til å velge aktiv tenant for å bruke det vanlige panelet. ✅
- Hele arkitekturen dokumenteres nå; tenant-velgeren (inkrement 1) implementeres først. ✅
