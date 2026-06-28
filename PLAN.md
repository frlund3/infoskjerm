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

## DET SOM GJENSTÅR

### 🔴 1. Den dynamiske modellen (VIKTIGST — feil i dagens kode)
Dagens `src/lib/xibo/sync.ts` lager **én layout per nyhet** = FEIL. Skal være DYNAMISK:
- **Publiser → upsert en RAD i DataSet «Nyheter» (id 1)**, ikke en layout. Match eksisterende via `contentId`. Slett rad ved avpublisering.
- **Base-malen får en nyhets-sone = DataSet View** som **roterer** gjennom radene, filtrert per butikk.
- Skriv om `sync.ts` + `saveContent` (`src/app/admin/innhold/actions.ts`). Fjern layout-per-nyhet.

### 🔴 2. Rebygg base-malen (Xibo layout 12 «Gange-Rolv Mal», campaign 8)
- **Digital klokke + dato** — mindre (clockTypeId=1=digital, IKKE 2=analog som nå)
- **Yr-vær per butikk** — lag `/widget/vaer?lat=&lon=` i appen (Yr: `api.met.no/weatherapi/locationforecast/2.0/compact`, User-Agent, cache), embed i Xibo som web-widget. Fyll lat/long på de 16 butikkene i Supabase `stores`.
- **Nyhets-sone = DataSet View** mot DataSet 1 (roterer)
- **Ticker** (behold)

### 🟠 3. Planlegg malen til display groups
`POST /api/schedule` → koble malen til butikkenes display groups ut fra målretting, så det vises på riktige skjermer.

### 🟡 4. Resten
- Stillingsannonser som innholdstype (enum `job` + felt: butikk, kontaktperson, søk-lenke) — eksempel: gangerolv.no/stillinger
- Bursdagshilsen + flere typer
- Per-rolle datafiltrering (enhetsadmin ser kun sine butikkers innhold)
- Raspberry Pi: Arexibo-spiller når maskinvare finnes
- GDPR: oppdater Framtid Tech AS art.30 (Xibo/Hetzner som underdatabehandler)

---

## Xibo-API-oppskrifter (verifisert v4.4)
**Lag layout:** `POST /layout {name,resolutionId:1}` → parent. `GET /layout?parentId={id}&embed=regions,playlists` → draft. `POST /region/{draft} {type:frame,width,height,top,left}` → `regionPlaylist.playlistId`. `POST /playlist/widget/{type}/{playlistId}` (type: text/clock/datasetview/embedded). `PUT /playlist/widget/{widgetId} {...}`. `PUT /layout/publish/{parent} {publishNow:1}`.
**Forhåndsvis:** `/campaign/{campaignId}/preview` (finn campaignId: `GET /layout?length=100&embed=campaigns`).
**DataSet-rad:** `GET/POST /dataset/data/{dataSetId}`, `PUT/DELETE /dataset/data/{dataSetId}/{rowId}`.
Layout-id endres ved publisering; gjør checkout→edit→publish sammenhengende.

## Definition of done for #1+#2
Publiser 2-3 nyheter → rader i DataSet 1 → malen roterer gjennom dem med digital klokke+dato, Yr-vær og ticker. Ingen «én layout per nyhet».
