# Superadmin-plattform — kjente oppfølginger etter inkrement 1

Dato: 2026-07-01. Gjelder branch `feat/superadmin-plattform`. Disse ble bevisst holdt
utenfor inkrement 1 (tenant-velger) og bør tas i senere runder.

## 1. Mutasjoner scopet kun på `id` (defense-in-depth) — RLS er IKKE nok

**Viktig premiss:** migrasjon `026_store_isolation_rls.sql` gir `super_admin` ubetinget tilgang
(`get_my_role() = 'super_admin' then true`). Under act-as gir RLS derfor **null** tenant-isolasjon
for super_admin — kun eksplisitte app-lag-filtre gjør det. Inkrement 1 scopet alle LISTE-lesninger
og (etter final review) `stores/[id]`-siden + hele `stores/actions.ts`. Gjenstår: mutasjoner som
kun scoper på `id`/`in(ids)`. Lav praktisk risiko (id-er kommer fra nå-scopede lister i UI-et), men
en super_admin som sender en crafted id fra en annen tenant ville truffet den. Kjente steder:

- `src/app/admin/settings/actions.ts`: `sendCommand`, `regenerateToken`, `deleteScreen`, `createScreen` (`screens` by id), `updateChainBranding`, `uploadChainLogo` (`chains` by id). Bruker `requireUser()`.
- `src/app/admin/users/actions.ts`: `updateUserRole` (`users.update().eq("id", …)`).
- `src/app/admin/innhold/actions.ts`: `saveContent` (UPDATE), `bulkSetStatus`, `bulkDeleteContent`, `bulkShiftPeriod`, `deleteContent`, `duplicateContent` (kilde-SELECT) — alle `content_items` by id/`in(ids)`.

Anbefalt mønster: bytt `requireUser()` → `requireRole([...])` og legg `.eq("tenant_id", tenantId)`
på mutasjonen (for tabeller med `tenant_id`; for join-tabeller verifiser forelder-radens tenant).

## 1b. Mobil: banner kun i drawer

`ImpersonationBanner` rendres via `<Sidebar>` inne i mobil-drawer-en (`mobile-nav.tsx`), så «Avslutt»
er tilgjengelig, men bare etter at man åpner hamburger-menyen — ikke på den alltid-synlige topplinja.
Vurder en kompakt «opptrer som»-indikator i mobil-topplinja hvis dette oppleves som skjult.

## 2. Pre-eksisterende rolle-inkonsistens: `/admin/settings`

`src/app/admin/settings/page.tsx` guarder med `["super_admin","chain_manager","store_manager"]`,
men sidebaren viser «Innstillinger» også til `area_manager`
(`["super_admin","chain_manager","area_manager","store_manager"]`). En `area_manager` inviteres av
menyen, men blir redirectet vekk fra siden. Dette er **pre-eksisterende** (bekreftet identisk på
base-commit `5cfbc4b`), ikke introdusert av act-as-arbeidet. Fiks: legg `area_manager` til
guarden (eller fjern fra sidebaren hvis bevisst).

## 3. E2E må kjøres i CI / lokalt med super_admin-testkonto

`e2e/act-as.spec.ts` er skrevet mot den faktiske auth-helperen (`loginAsAdmin` i `e2e/helpers.ts`)
og selektorene er verifisert mot ekte DOM, men kunne **ikke kjøres i sandkassen**: de seedede
test-credentialene (`TEST_EMAIL`/`TEST_PASSWORD`) ble avvist av Supabase auth, og test-brukeren er
uansett ikke `super_admin`. For å validere flyten trengs:
- en Supabase-bruker med `role = 'super_admin'` i `public.users`,
- `TEST_EMAIL`/`TEST_PASSWORD` satt til den brukeren,
- fersk sesjon (ingen `sa_active_tenant`-cookie forhåndssatt),
- minst én tenant-rad så «Opptre som» har et mål.

## 4. Miljø: `web-push` ikke installert i sandkassen

`web-push` (+`@types/web-push`) er **deklarert** i `package.json`, men var ikke installert i
sandkassen, så `npx tsc --noEmit` rapporterer én urelatert `TS2307` i `src/lib/push/send.ts`, og
`next build` kan ikke fullføres her. På et fullt installert miljø (CI/lokalt) forsvinner dette.
Kjør `npm install` + `npm run build` der for å verifisere produksjonsbygget.

## 5. Neste inkrementer (fra spec §9)

2. Plattform-dashboard (cross-tenant oversikt — vil bruke de nå-scopede, i dag ubrukte
   `getAdminStats`/`getChainOverview`-helperne).
3. Tenant-livssyklus (migrasjon 028: `tenants.status`/`archived_at` + opprett/rediger/suspender/arkiver).
4. Brukere & skjermer/drift på tvers.
