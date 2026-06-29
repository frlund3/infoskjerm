# PLAN — infoskjerm (START HER for ny chat)

White-label digital signage-CMS for **Gange-Rolv** (16 SPAR/EUROSPAR/JOKER-butikker), drevet av self-hosted **Xibo**. Appen (Next.js/Supabase/Vercel) er kundens ansikt; Xibo er den skjulte visningsmotoren for Raspberry Pi-skjermer.

> Detaljert handoff med API-oppskrifter: `docs/superpowers/HANDOFF-dynamisk-modell.md`
> Full plan: `docs/superpowers/plans/2026-06-28-infoskjerm-gjenstaende.md`

---

## Infrastruktur (ferdig satt opp)
- **Xibo CMS:** https://xibo.framtidtech.no (= `http://157.180.73.205`), v4.4.4, Docker på Hetzner. SSH: `ssh -i ~/.ssh/id_ed25519 root@157.180.73.205`, stack `/opt/xibo`.
- **Xibo API:** OAuth2 client-credentials. Secrets i Vercel + GitHub + `.env.local`: `XIBO_API_URL`, `XIBO_CLIENT_ID`, `XIBO_CLIENT_SECRET`. Klient: `src/lib/xibo/client.ts`.
- **Supabase:** prosjekt `fcxwrfmdvfjulhoebceq`. Tenant Gange-Rolv AS = `00000000-0000-0000-0000-000000000001`.
- **DNS/HTTPS:** xibo.framtidtech.no via Vercel DNS + Caddy/Let's Encrypt.
- **Server:** Hetzner `framtid-xibo` (cx23, Helsinki). Hetzner API-token ble lekket i klartekst → BØR roteres.

## Ferdig bygget
- 16 butikker som Xibo display groups (= Supabase `stores`, samme navn)
- App ryddet for all gammel custom-signage; kun Xibo-drevet
- `/admin/cms` — viser butikker/skjermer live fra Xibo
- `/admin/innhold` — komplett CMS: opprett/rediger/dupliser/slett/publiser, Tiptap HTML-editor, bilde (Supabase Storage), typer (nyhet/konkurranse/tilbud), målretting (alle/butikker/tagger), fra/til-dato, råflotte kort, søk/filter/paginering
- `/admin/users` — roller + butikk-tilgang per bruker (`user_stores`)
- `/admin/stores`, `/admin/settings` (branding) — ryddet
- RLS fikset på alle tabeller
- **Bevist:** CMS-publisering → ekte Xibo-render (forhåndsvist i nettleser)
- Xibo DataSet **«Nyheter» (dataSetId=1)** opprettet: kolonner tittel, tekst, bilde, type, butikker, fra, til, contentId

---

## FERDIG (dynamisk modell + per-butikk — 10/10)

### ✅ 1. Den dynamiske modellen
`src/lib/xibo/sync.ts` upserter nå **én RAD i DataSet «Nyheter» (id 1)** per publisering (match på `contentId`), sletter rad ved avpublisering/sletting. `saveContent`/`deleteContent` bruker modellen. Bevist end-to-end i prod.

### ✅ 2. Base-malen (campaign 8) rebygd
Digital klokke + dato, Yr-vær (webpage-widget `/widget/vaer`), DataSet View-nyhetssone (roterer + autoscroll lang tekst), ticker (`/widget/ticker`, scroll + rød puls). Bygges av `scripts/xibo/build-base-template.mjs` (delt logikk i `scripts/xibo/lib.mjs`). 16 butikker har fått lat/long.

### ✅ 3. Per-butikk-laget + planlegging
`scripts/xibo/build-store-layouts.mjs` lager **16 butikk-spesifikke layouts** (campaign 12–27): vær på butikkens koordinater + nyhetssone filtrert på `butikker`-kolonnen (ALLE eller butikknavn) + **dato-vindu** (`fra`/`til`). Hver er **planlagt** til sin display-gruppe (5–20, Always-daypart). Idempotent.

### ✅ Ekstra polish
- Nyhetskort: **publiseringsdato + forfatter** (byline) via DataSet-kolonner `dato`/`forfatter`.
- **Type-merkelapp** som kicker (GANGE-ROLV / KONKURRANSE / TILBUD / STILLING LEDIG) via kolonne `merkelapp`.
- `/widget/*` rammbar fra hvor som helst (CSP `frame-ancestors *`) — offentlig display-innhold.

### ✅ Stillingsannonser
Ny `content_type 'job'` (migrasjon 015) med felter kontaktperson + søknadslenke i skjemaet; vises på kortet med «STILLING LEDIG»-merkelapp.

> DataSet 1-kolonner nå: tittel, tekst, bilde, type, butikker, fra, til, contentId, **dato, forfatter, merkelapp**.
> Endre maldesign: rediger `scripts/xibo/lib.mjs` → kjør base- + butikk-builderne på nytt (idempotent).

---

## DET SOM GJENSTÅR

### 🟡 Resten
- Bursdagshilsen + flere innholdstyper
- Per-rolle datafiltrering (enhetsadmin ser kun sine butikkers innhold)
- Raspberry Pi: Arexibo-spiller når maskinvare finnes (ingen displays registrert ennå → planleggingen «venter» på hardware)
- **GDPR (AVKLARES):** global regel sier GangeRolv-prosjekter holdes UTENFOR Framtid Tech AS art.30. Men infra (xibo.framtidtech.no/Hetzner) er Framtid Tech AS, og hvis Framtid Tech driver signage-plattformen som databehandler for Gange-Rolv, hører Xibo/Hetzner som underdatabehandlere inn i protokollen. **Bekreft forretningsforholdet med Frank før master-protokollen røres.**

---

## Xibo-API-oppskrifter (verifisert v4.4)
**Lag layout:** `POST /layout {name,resolutionId:1}` → parent. `GET /layout?parentId={id}&embed=regions,playlists` → draft. `POST /region/{draft} {type:frame,width,height,top,left}` → `regionPlaylist.playlistId`. `POST /playlist/widget/{type}/{playlistId}` (type: text/clock/datasetview/embedded). `PUT /playlist/widget/{widgetId} {...}`. `PUT /layout/publish/{parent} {publishNow:1}`.
**Forhåndsvis:** `/campaign/{campaignId}/preview` (finn campaignId: `GET /layout?length=100&embed=campaigns`).
**DataSet-rad:** `GET/POST /dataset/data/{dataSetId}`, `PUT/DELETE /dataset/data/{dataSetId}/{rowId}`.
Layout-id endres ved publisering; gjør checkout→edit→publish sammenhengende.

## Definition of done for #1+#2
Publiser 2-3 nyheter → rader i DataSet 1 → malen roterer gjennom dem med digital klokke+dato, Yr-vær og ticker. Ingen «én layout per nyhet».
