# PowerPoint-opplasting — designspec

> Dato: 2026-07-01 · Branch: `worktree-powerpoint-opplasting` (fra `dev`) · Status: godkjent design, klar for plan
>
> **Merk:** Denne spec-en er NY (2026-07-01) og gjelder live-arkitekturen (widget + Xibo). Den har
> ingenting med de forlatte `docs/superpowers/`-dokumentene datert 2026-06-28 (slettet modulsystem) å gjøre.

## Mål

La butikkredaktører laste opp en PowerPoint (`.pptx`/`.ppt`) i innhold-editoren og få den vist som
roterende sidebilder på både **kunde-** og **intern**-skjermer — uten en egen «PowerPoint-modul».
Gjenbruker den eksisterende kundeavis-mekanikken (fil → server-renderte sidebilder i `body.pages[]` →
`PdfFlyer`-rotator). Maks **6 sider** rendres (som kundeavis i dag).

## Ikke-mål (bevisst utenfor scope — neste steg)

- Google Slides (levende publiser-til-web-embed)
- Entur sanntid kollektiv (ny widget)
- Redigering av selve PowerPoint-innholdet i appen (vi rendrer, vi redigerer ikke slides)
- Animasjoner/overganger fra PPT (vi viser statiske sidebilder)
- Bruk av Xibos eget mediebibliotek for PPT (bevisst valg: alt app-rendert, media eksternt)

## Arkitektur — gjenbruk, ikke nytt system

PowerPoint blir bare **enda et filformat på `slide`-typen**, akkurat som PDF er i dag (en `slide`
med `.pdf` i `body.imageUrl`). Ingen ny `ContentType`. Flyten:

```
Redaktør laster opp .pptx i innhold-editor (media-uploader, bucket "media")
        ↓  body.imageUrl = https://…/uploads/<uuid>.pptx
saveContent() lagrer slide (status live ved publisering)
        ↓  (ny) trigger render ved publisering  →  repository_dispatch
GitHub Action "Render decks":
   soffice --headless --convert-to pdf  <deck.pptx>   (LibreOffice på Ubuntu-runner)
        ↓  gjenbruk renderPdfPagesToJpeg (pdfjs-dist + @napi-rs/canvas), maks 6 sider
   last opp media/decks/<id>-p{N}.jpg  →  patch body.pages[] + body.pagesFor = imageUrl
        ↓
Widget /widget/tilbud (+ kampanje): PdfFlyer viser body.pages[] (roterer 7 sek)
        ↓
Xibo embedder widgeten → fysisk skjerm (Pi)
```

Kundeavis-PDF-flyten (`.pdf`) forblir uendret. Det nye render-scriptet håndterer **både** `.pdf` og
`.pptx/.ppt` slik at vi har én dekk-renderer, men PDF-grenen er bit-for-bit den samme som i dag.

## Komponenter og endringer

### 1. Opplasting — `src/components/admin/media-uploader.tsx`
- Utvid `accept` (der uploaderen brukes for slides) til å inkludere PowerPoint-MIME:
  `application/vnd.openxmlformats-officedocument.presentationml.presentation` (`.pptx`) og
  `application/vnd.ms-powerpoint` (`.ppt`).
- Utvid `formatHint` til å nevne «PowerPoint».
- **Krav fra Frank:** Vis en tydelig hjelpetekst ved opplasting av PowerPoint/PDF:
  **«Kun de første 6 sidene vises på skjermene.»** Plasseres synlig i opplastingsområdet/editoren,
  ikke gjemt. Gjelder både PPT og PDF (PDF har samme grense i dag, men den er udokumentert i UI).

### 2. Deteksjon av «deck» (fil som skal vises som sidebilder)
Innfør én delt helper, f.eks. `src/lib/content/deck.ts`:
```ts
export function isDeckUrl(url?: string | null): boolean   // .pdf | .pptx | .ppt (ignorer ?query)
export function isPptUrl(url?: string | null): boolean     // .pptx | .ppt
```
Brukes av: render-script (filter), widget-tilbud (velg PdfFlyer), admin-editor (vis riktig status/hint).
Erstatter dagens ad hoc `.endsWith(".pdf")`-sjekker (uten å endre PDF-oppførsel).

### 3. Rendering på skjerm — `src/app/widget/tilbud/pdf-flyer.tsx` (+ ruting i tilbud/kampanje)
- Der widgeten i dag velger `PdfFlyer` for `.pdf`, utvid til `isDeckUrl(...)` slik at `.pptx/.ppt`
  også ruter til `PdfFlyer`.
- `PdfFlyer` viser `pages[]` uendret når de finnes (gjelder både PDF og PPT — instant på Pi).
- **Viktig:** client-side pdf.js-fallbacken (linjene som laster `url` via `/api/kundeavis-pdf`)
  gjelder KUN PDF. For `.pptx/.ppt` uten ferdige `pages`: vis en rolig **«Presentasjonen gjøres klar …»**
  i stedet for å forsøke (og feile) client-side. Ingen nettleser kan rendre PPTX.

### 4. Bevar renderte sider ved lagring — `src/app/admin/innhold/actions.ts`
`buildBody()` bygger body fra bunnen og dropper i dag `pages`/`pagesFor`. For at en admin-lagring ikke
skal slette ferdig-renderte sider (og trigge unødvendig re-render):
- `saveContent()`/`buildBody()` skal **bevare `pages` + `pagesFor`** fra eksisterende rad når
  `body.imageUrl` er uendret og fila er et deck. Endres kildefila (ny `imageUrl`), forkastes gamle
  `pages` (blir re-rendret). Dette gjelder både PDF og PPT.
- Implementeres ved at `saveContent` ved oppdatering leser eksisterende `body.pages/pagesFor` og fletter
  dem inn når `pagesFor === ny imageUrl`.

### 5. Render-jobb — `scripts/render-decks.mjs` (utvidelse av `render-kundeavis.mjs`)
- Behold `render-kundeavis.mjs` sin PDF-oppførsel; generaliser til også å ta `.pptx/.ppt`.
- For PPT: last ned fila til temp, kjør `soffice --headless --convert-to pdf --outdir <tmp> <fil>`,
  les resulterende PDF, kjør eksisterende `renderPages` (maks 6, scale 1.5, jpeg 0.82).
- Lagre til `media/decks/<id>-p{N}.jpg` (PDF-kundeavis beholder `kundeavis/…`-stien for bakoverkompat).
- Idempotent: hopp over når `pages` finnes og `pagesFor === imageUrl` (samme mønster som i dag).
- Env uendret: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### 6. GitHub Action — `.github/workflows/render-kundeavis.yml` (utvid) eller ny `render-decks.yml`
- Legg til `repository_dispatch` (type `render-decks`) som trigger, i tillegg til daglig cron + manuell.
- Installer LibreOffice på runneren ved behov: `sudo apt-get update && sudo apt-get install -y libreoffice-impress`
  (eller hele `libreoffice`); verifiser `soffice`-sti. Ubuntu-runner har ofte LibreOffice forhåndsinstallert —
  bekreftes i implementering; ellers apt-installer.
- Kjør `render-decks.mjs` (håndterer PDF + PPT). JOKER-steget beholdes.

### 7. Rask trigger ved publisering — `src/app/admin/innhold/actions.ts`
- Når en `slide` med deck-fil publiseres (`status = live` og `isDeckUrl(imageUrl)`), send en
  `repository_dispatch` (event `render-decks`) til `Framtidmedia-no/infoskjerm` via GitHub API.
- Krever en PAT med `repo`-scope som secret (`GH_DISPATCH_TOKEN`) i `.env.local` + GitHub Secrets +
  Vercel. **Sett med `printf` (ikke `echo`)** for å unngå trailing newline (se prosjekt-CLAUDE.md).
- Best-effort: feil i dispatch skal ikke blokkere lagring (logg + fall tilbake til daglig cron).
- Resultat: sider dukker opp på skjerm innen ~1–2 min etter publisering i stedet for opptil et døgn.

## Datamodell

Ingen skjemaendring. Alt lever i `content_items.body` (JSONB) på en `slide`:
- `imageUrl`: `https://…/uploads/<uuid>.pptx` (kildefil)
- `pages`: `string[]` — URLer til renderte JPEG-sider (maks 6)
- `pagesFor`: `string` — `imageUrl` sidene ble rendret fra (re-render-markør)

## Feilhåndtering

- **PPT uten pages ennå:** widgeten viser «Presentasjonen gjøres klar …» (ingen client-fallback).
- **Konvertering feiler** (korrupt fil, soffice-feil): scriptet logger `✗ <tittel>: <feil>` og går videre;
  sliden viser fortsatt vente-tilstanden. Redaktør ser i admin at sider mangler.
- **Dispatch-trigger feiler:** svelges (logges); daglig cron fanger opp.
- **> 6 sider:** kun de 6 første rendres — kommunisert i UI (krav 1).

## Testing (definition of done)

1. **Lokal render (enhet):** kjør `render-decks.mjs` mot en ekte test-`.pptx` → verifiser at 6 JPEG-sider
   genereres og lastes opp (krever LibreOffice lokalt; hvis ikke tilgjengelig, testes PDF-grenen som allerede
   virker + PPT-grenen verifiseres i Action-kjøring).
2. **Bevaring av pages (enhet):** `saveContent` på en deck-slide med uendret `imageUrl` beholder `pages/pagesFor`.
3. **E2E (Playwright, egen dev-port — unngå stale-server):** last opp `.pptx` i `/admin/innhold` →
   publiser → verifiser vente-tilstand → (etter render/seed av pages) verifiser sider i `/widget/preview`
   eller `/widget/tilbud?store=…` → screenshot av rotator.
4. **«Kun 6 sider»-melding:** verifiser at teksten vises i editoren ved deck-opplasting.
5. **Frank tester i UI:** laster opp et ekte deck, ser det rullere på `/vis/<butikk>`-kiosk.

## CMS-krav (global regel — oppfylt)

- Kunde-redigerbart innhold (opplastet deck) ligger i DB (`content_items`) + Storage (`media`-bucket) ✔
- Admin-CRUD finnes (eksisterende innhold-editor: opprett/les/oppdater/slett) ✔
- Ingen hardkodet kunde-tekst — decket er brukerens egen fil ✔
- **Known non-CMS:** «Presentasjonen gjøres klar …»-systemteksten og «Kun 6 sider»-hjelpeteksten er ren
  systemtekst (ikke kunde-redigerbar) — dokumenteres som known non-CMS.

## Åpne punkter for implementering

- Bekreft om `ubuntu-latest`-runneren har `soffice` forhåndsinstallert (spar apt-steg hvis ja).
- Finn nøyaktig hvor `media-uploader` konfigureres for slides (accept-prop) og hvor tilbud/kampanje
  ruter til `PdfFlyer`, for minimale, presise diff-er.
- Verifiser at `GH_DISPATCH_TOKEN` ikke allerede finnes som secret før ny opprettes.
