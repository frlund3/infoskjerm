# Sprinter — løft av brukeropplevelse, fleksibilitet og Xibo-API-bruk

Branch: `feat/cms-driftsverktoy` · isolert worktree. Bygger på `ccbf16f` (ekte Xibo-skjermer i admin).

Gjeldende arkitektur (kort): **Xibo = motoren** (displays, display-grupper 1:1 med butikk, planlegging, RPi). **Appen** = innholdseditor (`/admin/innhold` → Supabase `content_items`) + widget-renderer (`/widget/*` embeddet i Xibo). Xibo-klient: `src/lib/xibo/client.ts` (generisk `xiboFetch`, OAuth2). Det gamle modulsystemet er slettet (`fd22ecf`) — ikke gjenoppliv det.

---

## Multi-tenant + Mobile AS + sikkerhet (2026-07-01) ✅

**Multi-tenant / Mobile AS (bilforhandler-kjede) onboardet:**
- Per-tenant terminologi (`Butikk`↔`Forhandler`), dynamiske avdelinger, per-tenant **feature-flagg** (`tenants.features` + `src/lib/tenant/features.ts`): `offerCards`/`gln` (dagligvare), `campaignCards` (liggende kampanjemal). Bygg tenant-spesifikke maler via flagg — aldri hardkod tenant-navn.
- Mobile: 34 forhandlere + 19 bilmerker som tagger, Mobile-logo (mobile.no), Mobile-kjede.
- **Liggende premium kampanjemal** (`/widget/kampanje`, `campaign`-struktur) + editor («Bygg kampanjekort»). Galleri/konkurranse også i liggende.
- **Kiosk «telefon/nettbrett som skjerm»** (`/vis/<enhet>`, `?type=intern`, `?orientation=liggende`) med valgfritt passord per enhet.
- **Xibo:** alle 34 forhandlere satt opp — kundeskjerm (stående) + internskjerm (`– Bakrom`, liggende, uten dagligvare-KPI). Klare for Pi-innmelding.

**Sikkerhetshardening (revisjon: 3 agenter + DB-simulering):** kjerne-tenant/rolle-isolasjon verifisert vanntett; alle funn tettet (content_targets, KPI-oversikt, settings-roller, skjermbilde-IDOR, kundeklubb/invitasjoner-scoping, user_stores/reg_codes RLS). Migrasjoner 026–036.

**Gjenstår (oppfølging):** fang untracked act-as-migrasjon som fil; ekte org.nr/GLN per forhandler; Mobile-wordmark-logo; velg skjermorientering på fysiske Mobile-skjermer.

---

## Sprint 1 — `/admin/cms` fra forhåndsvisning til driftsverktøy ✅ aktiv
Mål: en butikkleder ser om skjermen lever, hva den viser, og kan tvinge oppdatering — uten å logge inn i Xibo.

- **A2 — Rik «vises nå»-status.** Utvid `XiboDisplay`/`StoreScreen` med `mediaInventoryStatus` (oppdatert/laster/utdatert), `currentLayoutId` → layoutnavn, `clientVersion`, `lastAccessed`. Vis per skjerm i `/admin/cms`.
- **A3 — «Oppdater skjermen nå».** Server-action → `POST /displaygroup/{id}/action/collectNow`. Tvinger Pi-en å hente nytt innhold umiddelbart etter publisering.
- **A1 — Live skjermbilde.** Server-action `PUT /display/requestscreenshot/{id}` + proxy-route som streamer `GET /display/screenshot/{id}` (binært, server-side token). Vis bildet i admin.
- Ærlig tom-tilstand: «Ingen skjerm tilkoblet ennå» (gjelder alle 16 butikker til en Pi meldes inn).

Filer: `src/lib/xibo/client.ts`, `src/lib/xibo/screens.ts`, `src/app/admin/cms/{page,screen-preview,actions}.tsx`, `src/app/admin/cms/skjermbilde/[displayId]/route.ts`.

## Sprint 2 — Fleksibilitet: generisk spesial-widget-bygger ✅
Mål: «butikk X trenger en egen side» blir én kommando, ikke dager.

- **Generisk provisjonering i `lib.mjs`:** `findOrCreateLayout`, `findDisplayGroupId`, `scheduleCampaignToGroup` (idempotent), `provisionWidgetLayout` — additivt, rører ikke eksisterende byggere.
- **`scripts/xibo/build-widget-layout.mjs`** — CLI: `--widget=/widget/<navn> --store="<butikk>" --name="<layout>" [--daypart=<id>] [--query=…] [--no-schedule]`. Slår opp butikk-id, embedder widgeten i en fullskjerm-layout og planlegger til butikkens skjermgruppe.
- **B2 — Dayparts:** eksponert via `--daypart=<id>` (Always = 2). Egendefinerte tidssoner (morgen/lunsj/kveld) opprettes i Xibo `/daypart` og sendes inn med id.

**Slik legger man til en spesialside for én butikk nå:** (1) lag `/widget/<navn>` i Next (leser fra Supabase), (2) kjør `build-widget-layout.mjs` mot butikkens gruppe. Ferdig.

> NB: build-scriptet muterer delt Xibo-state (prod) — kjøres bevisst, ikke i CI. Verifisert her med `node --check` + ren modul-import; ikke kjørt mot prod.

## Sprint 3 — Innsikt: proof-of-play + feilvarsler ✅
- **`src/lib/xibo/insight.ts`** — defensivt datalag: `GET /fault` (skjermfeil) + `GET /stats?type=Layout` (proof-of-play, aggregert per layout, 7-dagers vindu). Tolererer både array- og `{data}`-svar; aldri kast.
- **`InsightPanel`** øverst i `/admin/cms`: aktive skjermfeil + «mest vist» med søylegraf. Ærlige tom-tilstander når ingen Pi er tilkoblet.

## Sprint 4 — Kjedelogo + tilbudskort 10/10 ✅
Mål: tilbudskortet på kundeskjerm viser riktig kjedelogo per butikks kjede, og kjeder kan laste opp egen logo.

- **Migrasjon `020_chain_logo.sql`:** `chains.logo_url` (additiv). Kjørt mot prod (`gange-rolv-infoskjerm`).
- **Innstillinger → branding-panel:** logo-opplasting per kjede til `media`-bucket (`uploadChainLogo`, PNG/JPG/WEBP/SVG, maks 5 MB), med forhåndsvisning. Ingen hardkoding — logo bor i DB/storage.
- **`/widget/tilbud`:** henter butikkens kjede (`stores → chains`), og `OfferCard` viser kjedelogoen i bunnen (erstatter hardkodet «Gange-Rolv»-bar). Badge bruker kjedefarge. Fallback til kjedenavn i kjedefarge til logo er lastet opp.

Filer: `supabase/migrations/020_chain_logo.sql`, `src/app/admin/settings/{actions.ts,branding-panel.tsx,page.tsx}`, `src/app/widget/tilbud/{page.tsx,offer-card.tsx,tilbud-rotator.tsx}`, `src/types/database.ts`.

> Gjenstår (manuelt, CMS-vei): last opp EUROSPAR/SPAR/JOKER-logoene i Innstillinger.

---

# Integrasjoner — flere widgets (Sprint 5+)

Mål: utvide widget-tilbudet. Hver widget følger den etablerte oppskriften (Sprint 2): lag `/widget/<navn>` (leser fra Supabase, filtrerer på `?store=`), kjør `build-widget-layout.mjs` mot butikkens skjermgruppe. Kunde-redigerbart innhold får admin-CRUD (Franks CMS-krav: ingen hardkoding). PowerBI er bevisst **droppet** — «publish to web» kolliderer med RLS/sertifiserte/Fabric-modeller, og sikker variant (app-owns-data) krever kapasitet + token-backend; dekkes 80 % av web-embed (Sprint 5).

## Sprint 5 — Media: videoopplasting + YouTube 🎯 (må-have)
Mål: butikk kan vise egen video og YouTube på skjerm — levert via Xibo som alt annet.

- **Media-lagring:** Supabase Storage-bucket `media` + opplasting i admin (`kundeinnhold`/`innhold`). Aldri `/public`. Mediebibliotek for gjenbruk på tvers av butikker.
- **`/widget/video`** — leser valgt video for butikk (`?store=`) fra Supabase/Storage; looper, mute, fullskjerm. Vurder push native til Xibo-mediebibliotek for jevnere avspilling (robusthet > browser-`<video>`); start med widget-embed for konsistens med eksisterende arkitektur.
- **`/widget/youtube`** — innholds-/`?id=`-styrt; `youtube-nocookie`, autoplay+mute+loop. Robust modus (opt-in): last ned til Xibo-mediebibliotek for nett-uavhengig avspilling på skjerm.
- **Admin-CRUD** for begge: ny content-type `video` (migrasjon + `content-form.tsx` + `audience.ts`), så kunde velger video/lenke i admin.

Filer: `src/app/widget/video/page.tsx`, `src/app/widget/youtube/page.tsx`, `src/lib/media/*`, `src/app/admin/innhold/_components/content-form.tsx`, `src/app/admin/innhold/audience.ts`, `supabase/migrations/NNN_content_type_video.sql`, `src/lib/xibo/media.ts` (native push, valgfri).

## Sprint 6 — Web-embed (generisk iframe) 🔑 høyest avkastning
Mål: én widget som viser vilkårlig URL — dekker PowerBI «publish to web», dashboards, intranett, menyer, Google Slides. Én widget, uendelig long-tail.

- **`/widget/embed`** — `?url=` med URL-allowlist + sandbox-iframe + fallback-bilde ved nedetid; valgfri auto-refresh.
- **Admin-CRUD:** butikk/kjede lagrer embed-URL-er i Supabase (ingen hardkoding).
- Provisjonering via eksisterende CLI: `--query=url=…` (støttes allerede).

Filer: `src/app/widget/embed/page.tsx`, admin-form-felt, evt. `content_type embed` + migrasjon.

## Sprint 7 — Lettvekts datakort (åpne, norske API-er)
Mål: ambient-widgets. Hver = `/widget/<navn>`, server-side fetch + cache i Supabase, ærlig feil-/tom-tilstand. Aldri tredjeparts-JS på skjermsiden.

- **`/widget/klokke`** — klokke/dato/verdensklokke.
- **`/widget/nedtelling`** — nedtelling mot dato/tid («Tilbudet varer i …»).
- **`/widget/strompris`** — hvakosterstrommen.no, prissone fra butikk.
- **`/widget/avganger`** — EnTur åpent API, nærmeste holdeplass fra butikk-koordinater.

Filer: `src/app/widget/{klokke,nedtelling,strompris,avganger}/page.tsx`, `src/lib/integrations/{strompris,entur}.ts`.

## Sprint 8 — Generisk RSS/nyhetsfeed
Mål: én feed-widget dekker VGTV, E24, NRK, blogg — i stedet for én logo per kilde.

- **`/widget/feed`** — `?src=<rss-url>`; server-side parse + cache; rene kort (ikke rå HTML), rotasjon.
- **Admin-CRUD:** feed-URL-er per kjede/butikk.

Filer: `src/app/widget/feed/page.tsx`, `src/lib/integrations/rss.ts`.

## Sprint 9 — Sosiale & kalender (OAuth — egen satsing) 🔴
Mål: Instagram/Facebook-vegg + Google/Microsoft-kalender. Bevisst sist: OAuth + token-refresh + leverandørgodkjenning = høy vedlikeholdskost per verdi.

- Server-side henting + cache; **vurder tredjeparts-aggregator** for sosiale feeds framfor å eie Meta/Google-API.
- Tokens lagres kryptert i Supabase, aldri i klient.
- **GDPR:** nye underdatabehandlere → oppdater Framtid Tech AS-behandlingsprotokoll + relevante personvernerklæringer.

Filer: `src/app/widget/{sosialt,kalender}/page.tsx`, `src/lib/integrations/*`, `oauth_connections`-tabell.

**Anbefalt rekkefølge:** 5 (må-have) → 6 (høyest avkastning) → 7 → 8 → 9 (dyrest).

---

### Status
- [x] Sprint 1 — driftsverktøy i /admin/cms
- [x] Sprint 2 — generisk spesial-widget-bygger
- [x] Sprint 3 — proof-of-play + feilvarsler
- [x] Sprint 4 — kjedelogo + tilbudskort 10/10
- [ ] Sprint 5 — media: videoopplasting + YouTube
- [ ] Sprint 6 — web-embed (generisk iframe, dekker PowerBI publish-to-web)
- [ ] Sprint 7 — lettvekts datakort (klokke, nedtelling, strømpris, EnTur)
- [ ] Sprint 8 — generisk RSS/nyhetsfeed
- [ ] Sprint 9 — sosiale & kalender (OAuth, egen satsing)
