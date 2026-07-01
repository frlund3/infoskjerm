# Multi-tenant white-label + act-as korrekthet — roadmap

Dato: 2026-07-01. Oppdaget under testing med tenant #2 «Mobile AS» (34 forhandlere) på act-as (PR #36).

## Arbeidsdeling — UNNGÅ DUPLISERING

Flere parallelle grener adresserer allerede white-label-laget. Disse skal **konsolideres/merges**, ikke reimplementeres:

| Tema | Gren | Mekanisme | Merge-status |
|------|------|-----------|--------------|
| Dynamiske labels («butikk»→«forhandler», avdelinger) | `feat/tenant-mobile-dynamisk` | `tenants.unit_label`/`unit_label_plural`, `src/lib/tenant/config.ts` `getTenantConfig()`, migr. 028-029 | ikke i dev/main |
| Feature-flagg + gating (SPAR-import, offerCards, gln, topbar-branding) | `feat/tenant-features` | `tenants.features` (jsonb), `src/lib/tenant/features.ts` `hasFeature()`, migr. 030 | ikke i dev/main |
| Rest-scrub av «butikk»-strenger | `feat/scrub-butikk-strenger` | bruker `unitLabelPlural` i UI-tekst | bygger på tenant-mobile-dynamisk |
| Skjul «Alle»/«Tagger» for butikk-roller | `feat/skjul-alle-butikkroller` | `canTargetAllStores(role)` | separat |

Minne `tenant-features.md` velsigner `tenants.features` + `src/lib/tenant/features.ts` som kanonisk. **Aldri hardkod tenant-navn.**

Dekker Franks funn: hardkodet «Gange-Rolv» (topbar branding → tenant-features), «Butikker»-labels (→ tenant-mobile-dynamisk + scrub), SPAR-masseimport-gating (→ tenant-features).

## MITT ansvar — act-as-korrekthet/lekkasjer (ingen gren dekker)

### Bug #4 — `getStoresBoard` viser 0 av 34 for Mobile
- `src/lib/admin/queries.ts` `getStoresBoard(supabase, tenantId)` filtrerer `chains.tenant_id`. Mobiles 34 butikker har `stores.tenant_id`=Mobile MEN ligger under kjeder eid av annen tenant (eller Mobile mangler egne kjeder) → 0 treff. «Vis på»-velgeren (`loadStoreOptions`, filtrerer `stores.tenant_id`) viser derimot 34.
- **Fiks:** endre `getStoresBoard` (+ `getStoresGroupedByChain`, `getChainOverview` som har samme feil) til å filtrere `stores.tenant_id` og gruppere etter kjede i koden. Oppdater konsumenter (`stores/page.tsx`, `skjermer/page.tsx`).
- Dette er en feil i inkrement-1s Task 7 (feil join-punkt) → hører hjemme i act-as-PR-en.

### Bug #2 — `/admin/logg` ikke tenant-scopet
- `src/app/admin/logg/page.tsx:14-21` leser `audit_log` uten tenant-filter. `audit_log` har INGEN `tenant_id`-kolonne.
- **Fiks:** migrasjon som legger `tenant_id` på `audit_log` + backfill + sett verdien i skrive-stien (`src/lib/admin/audit.ts`), deretter `.eq("tenant_id", tenantId)` i logg-spørringen. Koordiner migrasjonsnummer (028-030 er tatt av andre grener → bruk neste ledige, f.eks. 031, eller timestamp-format).

### Bug #3 — CMS-preview kan vise annen tenants innhold
- `src/app/admin/cms/page.tsx` er scopet (Task 7b), men `src/app/admin/cms/screen-preview.tsx:53` kaller `fetchLiveContent(...)`. Verifiser at `src/lib/content/live.ts` `fetchLiveContent` scopes til aktiv tenant; hvis ikke, legg til tenant-filter.
- OBS: `feat/tenant-mobile-dynamisk` rører også `cms/page.tsx` + `screen-preview.tsx` → koordiner for å unngå konflikt.

## Gjenstående follow-ups fra inkrement 1 (se `…-oppfolginger.md`)
- Category C: id-only-scopede mutasjoner (`innhold/actions.ts`, `settings/actions.ts`).
- `settings/page.tsx`-guard mangler `area_manager` (pre-eksisterende).
- Mobil: banner kun i drawer.
- E2E i CI med super_admin-konto.

## Senere inkrementer (superadmin-plattform)
- **2:** Plattform-dashboard (cross-tenant oversikt; bruker nå-scopede `getAdminStats`/`getChainOverview`).
- **3:** Tenant-livssyklus (opprett/rediger/suspender/arkiver; `tenants.status`; service-role).
- **4:** Brukere & skjermer/drift på tvers.

## Merge-koordinering (act-as, PR #36)
- PR #36 → `dev` er RENT (mine 17 commits).
- Direkte merge til `main` = 6 konflikter (`main` har divergert fra `dev` via features merget dit), og lokalt tre er dirty med andre agenters WIP → ingen trygg in-place rebase.
- Prod-deploy skjer på push til `main` → dette er en irreversibel handling; velg mål bevisst.
