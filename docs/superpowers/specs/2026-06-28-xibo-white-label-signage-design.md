# Infoskjerm — Xibo som skjult motor + white-label nyhetsapp

**Status:** Utkast til godkjenning
**Dato:** 2026-06-28
**Eier:** Frank Lunde / Framtid Tech AS

---

## Mål (én setning)

Få kjede-/flerenhets digital signage i produksjon ved å bruke **Xibo** som visningsmotor (skjult for kunden), og bygge **kun** en tynn white-label nyhetsapp på `infoskjerm.framtidtech.no` der butikksjefer legger ut nyheter og velger hvilke butikker de skal til.

## Bakgrunn

Den custom-byggede Next.js-appen har vist seg å være for stor og ustabil å bygge fra bunnen av (layout-editor, planlegging, spiller, per-butikk-data). Xibo løser hele den tunge signage-jobben ferdig og testet. Vi beholder kun den ene biten som er verdt å eie selv: en enkel, merkevarebygd innholdsflate for kunden.

Custom-appen legges **på is** (ikke slettet — ligger i git på `main`).

---

## Arkitektur

```
Kunde (butikksjef)
   │  logger inn, legger ut nyhet, velger butikker
   ▼
infoskjerm.framtidtech.no   ← white-label Next.js-app (DET VI BYGGER)
   │  REST API (server-side, token skjult)
   ▼
Xibo CMS (Docker på Hetzner)   ← skjult motor (vi administrerer)
   │  display groups, layouts, DataSets, planlegging, vær/klokke-widgets
   ▼
Raspberry Pi-spillere (Arexibo)   ← én pr. skjerm, i riktig butikk-gruppe
```

### Ansvarsdeling

| Lag | Hvem | Ansvar |
|-----|------|--------|
| **Xibo CMS** | Framtid Tech (admin) | Layout-design (vær/klokke/nyhets-ramme), display groups, planlegging, spiller-styring, vær-widget pr. sted |
| **White-label app** | Kunde (selvbetjent) | Logg inn, skriv nyhet (tittel/tekst/bilde), velg mottaker-butikker, publiser |
| **Integrasjon** | Framtid Tech (kode) | Mapping butikk ↔ Xibo display group, bruker ↔ rettigheter, push til Xibo via API |
| **RPi-spiller** | Framtid Tech (oppsett) | Arexibo installert, registrert mot CMS, lagt i riktig butikk-gruppe |

---

## Visnings- og målrettingsmodell (Xibo)

- **Én Display Group per butikk** (f.eks. «Blindheim», «Moa», «Spjelkavik»).
- **Regiongrupper** kan inneholde flere butikker (f.eks. «Sunnmøre» = 5 butikker) for grovere målretting.
- **Base-layout** (vær + klokke + dato + nyhets-region + evt. ticker) planlegges til **alle** skjermer — selve rammen er lik overalt.
- **Nyhetssaker** målrettes: *alle* / *valgte butikker* (krav: «flere valgte butikker»).
  - Værmelding henter **butikkens eget sted** (lat/long lagret per display i Xibo).
  - Klokke/dato er universelle widgets.

### Teknisk vei for per-butikk-nyheter (avklares i plan-fasen)

To kandidater, velges i implementasjonsplanen etter en liten spike mot Xibo API:

1. **DataSet + filtrering:** Én delt «News»-DataSet (kolonner: tittel, tekst, bilde-URL, target-grupper, fra/til-dato). Nyhets-regionen viser radene som matcher skjermens butikk og roterer. Krever at filtrering kan gjøres per display (verifiseres).
2. **Planlegging til grupper:** Nyhet pushes som content/campaign planlagt til de valgte butikkenes display groups. Robust og helt innebygd; «flere valgte butikker» = flere grupper i samme schedule-kall.

Anbefaling: prototyp vei 1 først (gir reneste «én rad = én nyhet»-modell), fall tilbake til vei 2 hvis per-display-filtrering ikke holder.

---

## White-label nyhetsapp — omfang

**Bygges:**
- Innlogging (gjenbruk eksisterende Supabase-auth + roller: chain_manager, area_manager, store_manager).
- «Legg ut nyhet»-skjema: tittel, tekst, bilde (opplasting), gyldighetsperiode (valgfri), **mottaker-velger (flere valgte butikker)**.
- Liste/rediger/slett egne nyheter.
- Rollebasert butikk-tilgang: en store_manager ser bare sine butikker i velgeren; area_manager flere; chain_manager alle i kjeden.
- Server-side integrasjonslag som kaller Xibo REST API med skjult token.

**Bygges IKKE (Xibo gjør det):**
- Layout-editor, soner, planleggingsmotor, spiller, vær/klokke-rendering, skjermstyring.

**Mapping-tabeller (i Supabase):**
- `store ↔ xibo_display_group_id`
- `news_item ↔ xibo_dataset_row_id / xibo_campaign_id` (for redigering/sletting)

---

## RPi-spillere

- **Arexibo** (Rust, gratis) på Raspberry Pi 5; offisiell Linux-spiller som alternativ.
- Hver RPi registreres i CMS, legges i sin butikks display group.
- Gjenbruker eksisterende kiosk-/fjernstyringsoppsett; RPi peker mot Xibo CMS i stedet for Vercel-appen.

## Infrastruktur

- **Dedikert Hetzner-server** for Xibo (Docker: CMS, MySQL, XMR message relay). Egen server, ikke på n8n-boksen, for isolasjon. Forventet ~CX22/CX32 (~€4–10/mnd).
- Daglig backup av Xibo-database (samme rutine-tankegang som n8n-boksen).
- API-token til Xibo lagres som secret (`.env.local` + GitHub secret), aldri i kode/chat.
- Hetzner API-token: **det forrige er kompromittert (limt i klartekst) og må trekkes tilbake**; nytt token lages og lagres som secret.

---

## Sikkerhet og GDPR

- Xibo self-hosted + Hetzner = databehandlere. Butikksjef-kontoer (navn/e-post) er personopplysninger.
- **Krav:** når oppsettet er live, oppdater Framtid Tech AS art.30-behandlingsprotokoll: nytt prosjekt i prosjektregister + Xibo (self-hosted, Hetzner) som underdatabehandler. (Egen oppgave i planen.)
- Token/secrets aldri i klartekst; Xibo API kalles kun server-side.

---

## Suksesskriterier (definition of done for MVP)

1. Xibo CMS kjører på Hetzner, tilgjengelig på et internt subdomene (ikke eksponert til kunde).
2. Minst én ekte RPi registrert og viser en base-layout med **vær (riktig sted) + klokke + dato + roterende nyheter**.
3. To butikker satt opp som display groups med ulik vær-lokasjon.
4. En nyhet lagt ut fra `infoskjerm.framtidtech.no` med «flere valgte butikker» vises **kun** på de valgte butikkenes skjermer, og roterer i nyhets-regionen.
5. Kunden har ingen Xibo-tilgang og ser ingen Xibo-merkevare.

## Åpne punkter (avklares i plan-fasen)

- Per-butikk-nyhet: DataSet-filtrering (vei 1) vs gruppe-planlegging (vei 2) — verifiseres med spike.
- Bildelagring: Xibo media-bibliotek via API, eller Supabase Storage + URL inn i DataSet.
- Hvor mange skjermer i MVP, og hvilken kjede som er først ut.

## Innholds-CMS (white-label authoring) — låst plan

Bygges som én komplett enhet i appen (`infoskjerm.framtidtech.no`), oppå eksisterende
Supabase-tabeller (`content_items`, `content_targets`, `stores`) + `media-uploader.tsx`.

**Innholdstyper:** nyhet, bursdagshilsen, konkurranse, lokalt tilbud, ticker (utvidbart).
**Per sak:** rik HTML-editor (Tiptap), bilde-opplasting (Supabase Storage), mottaker-velger
(flere valgte butikker / alle), fra/til-dato, status (utkast→publisert), rediger/dupliser/slett.
**Flate:** `/admin/innhold` (liste m/ søk+filter) + opprett + rediger. RÅFLOTT design.
**Synk til Xibo:** publisert innhold pushes til Xibo (DataSet/layout) målrettet butikkenes
display groups. Rendering-vei avgjøres med spike (DataSet-filtrering vs gruppe-planlegging).

**Prep før bygging:**
1. Rydd dobbel lockfile (behold pnpm-lock.yaml, fjern package-lock.json) så Vercel bygger konsistent.
2. Legg til Tiptap (`@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link`).
3. Migrasjon: utvid `content_type`-enum med `birthday`, `ticker`, `offer` (verifiser prosjekt-ID fcxwrfmdvfjulhoebceq først).

## Ikke i scope (YAGNI for MVP)

- Full multi-tenant SaaS-isolasjon for mange separate kunder (én Xibo-instans nå; flerkunde vurderes senere).
- Avansert planlegging/dagsplaner utover «gyldig fra/til».
- Migrering av eksisterende custom-app-innhold.
