# Sprinter — løft av brukeropplevelse, fleksibilitet og Xibo-API-bruk

Branch: `feat/cms-driftsverktoy` · isolert worktree. Bygger på `ccbf16f` (ekte Xibo-skjermer i admin).

Gjeldende arkitektur (kort): **Xibo = motoren** (displays, display-grupper 1:1 med butikk, planlegging, RPi). **Appen** = innholdseditor (`/admin/innhold` → Supabase `content_items`) + widget-renderer (`/widget/*` embeddet i Xibo). Xibo-klient: `src/lib/xibo/client.ts` (generisk `xiboFetch`, OAuth2). Det gamle modulsystemet er slettet (`fd22ecf`) — ikke gjenoppliv det.

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

## Sprint 3 — Innsikt: proof-of-play + feilvarsler
- **`GET /stats`** proof-of-play → ekte «hva ble vist, når, hvor lenge» (erstatter slettet `play_log`).
- **`GET /fault` + `/notification`** → skjermfeil i admin før kunden ser svart skjerm.

---

### Status
- [x] Sprint 1 — driftsverktøy i /admin/cms
- [x] Sprint 2 — generisk spesial-widget-bygger
- [ ] Sprint 3 — proof-of-play + feilvarsler
