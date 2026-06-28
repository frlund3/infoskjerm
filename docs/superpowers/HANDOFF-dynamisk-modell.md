# HANDOFF: Bygg den dynamiske modellen (infoskjerm + Xibo)

Selvstendig brief til en ny chat. Les hele før du begynner.

## Kontekst
`infoskjerm` (Next.js, Supabase, Vercel) er en **white-label CMS** oppå et **self-hosted Xibo** (skjult for kunden). Kunden lager innhold i appen; Xibo er visningsmotoren for skjermene (Raspberry Pi senere).

- **Xibo CMS:** https://xibo.framtidtech.no (også `http://157.180.73.205`). Versjon 4.4.4. Docker på Hetzner. SSH: `ssh -i ~/.ssh/id_ed25519 root@157.180.73.205`, stack i `/opt/xibo`.
- **Xibo API:** OAuth2 client-credentials. Secrets i Vercel + GitHub + `.env.local`: `XIBO_API_URL`, `XIBO_CLIENT_ID`, `XIBO_CLIENT_SECRET`. Token: `POST /api/authorize/access_token`. Klient: `src/lib/xibo/client.ts`.
- **16 butikker** = Xibo display groups (samme navn som Supabase `stores`). Innholds-CMS: `/admin/innhold` (lagrer i `content_items` + `content_targets`, målretting alle/butikker/tagger).

## DEN VIKTIGE KORREKSJONEN (hvorfor denne handoff finnes)
Den nåværende `src/lib/xibo/sync.ts` lager **én Xibo-layout per publisert nyhet**. Det er **FEIL**. Frank vil ha det **dynamisk**: ÉN base-mal med en nyhets-sone som **roterer** gjennom publiserte nyheter, filtrert per butikk. Man legger til en nyhet → den dukker opp i rulleringen. Ingen «hel side per nyhet».

## Riktig modell = Xibo DataSet
Allerede opprettet: Xibo DataSet **«Nyheter», dataSetId=1**, med kolonner: `tittel, tekst, bilde, type, butikker, fra, til, contentId`.

## Oppgaver (i rekkefølge)

### 1. Skriv om `src/lib/xibo/sync.ts`
- Ved publisering (`saveContent` i `src/app/admin/innhold/actions.ts`): **upsert en rad** i DataSet 1, IKKE lag en layout.
  - Finn eksisterende rad via `contentId`-kolonnen (GET `/api/dataset/data/1`), oppdater (`PUT /api/dataset/data/1/{rowId}`) eller opprett (`POST /api/dataset/data/1`).
  - Felt: tittel, tekst (HTML), bilde (URL), type, butikker (komma-separerte display-group-navn eller «ALLE»), fra/til (datoer), contentId.
- Ved avpublisering/sletting: slett raden.
- Fjern `createXiboLayout`/per-innhold-layout-logikken. Behold best-effort (aldri blokker Supabase-publisering).
- Fjern «Se på skjerm»-lenken som peker på per-innhold-campaign (eller pek den på malen).

### 2. Rebygg base-malen (Xibo layout 12 «Gange-Rolv Mal», campaign 8)
Soner:
- **Digital klokke + dato** (mindre! Ikke den analoge kjempa). Klokke-widget: `POST /playlist/widget/clock/{playlistId}`, sett `clockTypeId=1` (1=digital, 2=analog), format med tid + dato.
- **Yr-vær per butikk:** lag en liten side i appen `/widget/vaer?lat=&lon=` (eller `?butikk=`) som henter fra **Yr.no** (`https://api.met.no/weatherapi/locationforecast/2.0/compact`, riktig User-Agent, cache). Embed den i Xibo som en **Embedded/Web-widget** (iframe). Butikkene mangler lat/long i Supabase `stores` — fyll inn for de 16.
- **Nyhets-sone = DataSet View-widget** mot DataSet 1, som **roterer** gjennom radene. Filtrer per visning (butikk). (Per-display-filtrering i Xibo: verifiser med en spike — DataSet-filter eller egne maler per display group.)
- **Ticker** (behold den grønne nederst).

### 3. Planlegg malen til display groups
`POST /api/schedule` — koble malen (campaign) til butikkenes display groups så den faktisk vises. Verifiser daypart («Always»).

## Xibo layout-API-oppskrift (verifisert)
1. `POST /api/layout {name, resolutionId:1}` (1=1920x1080) → publisert parent (auto-lager draft).
2. `GET /api/layout?parentId={id}&embed=regions,playlists` → draft layoutId.
3. `POST /api/region/{draftId} {type:frame,width,height,top,left}` → `regionPlaylist.playlistId`.
4. `POST /api/playlist/widget/{type}/{playlistId}` (type «text», «clock», «datasetview», «embedded»…) → widgetId.
5. `PUT /api/playlist/widget/{widgetId} {...props}` (tekst: `{text,duration,useDuration:1}`).
6. `PUT /api/layout/publish/{parentId} {publishNow:1}`.
7. Forhåndsvisning: `/campaign/{campaignId}/preview` (IKKE /layout/preview). Finn campaignId via `GET /api/layout?length=100&embed=campaigns`.
- Lås: gjør checkout→edit→publish i sammenhengende kall. Layout-id endres ved publisering.

## Referanser
- Plan: `docs/superpowers/plans/2026-06-28-infoskjerm-gjenstaende.md`
- Spec: `docs/superpowers/specs/2026-06-28-xibo-white-label-signage-design.md`
- Supabase prosjekt-ID: `fcxwrfmdvfjulhoebceq`. Tenant: Gange-Rolv AS (`00000000-0000-0000-0000-000000000001`).
- Demo-layouts 5/7/8/10/12 i Xibo kan ryddes (de var per-innhold-eksperimenter).

## Definition of done
Publiser 2-3 nyheter i `/admin/innhold` → de dukker opp som rader i DataSet 1 → base-malen roterer gjennom dem med digital klokke+dato, Yr-vær og ticker → forhåndsvis via `/campaign/{id}/preview` og se rotering. Ingen «én layout per nyhet».
