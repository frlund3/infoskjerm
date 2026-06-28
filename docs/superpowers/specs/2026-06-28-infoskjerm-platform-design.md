# Infoskjerm Platform — Design Spec
**Dato:** 2026-06-28  
**Status:** Godkjent av produkteier  
**Versjon:** 1.0

---

## 1. Overordnet mål

Bygge en digital signage-plattform som er best i markedet på brukeropplevelse, funksjonalitet, modulfleksibilitet og tenant-tilpasning. Primærbruker er Gange-Rolv AS (NorgesGruppen-kjeder), men arkitekturen støtter multi-tenant SaaS fra dag 1.

**Kjerneprinsipper:**
- Alle beslutninger tas basert på brukeropplevelse
- Ingenting hardkodes — alt er konfigurerbart
- Forhåndsvisning er obligatorisk før publisering
- 30-sekunders propagering fra publisering til live skjerm

---

## 2. Kontrollhierarki (delegert modell)

```
super_admin
  └── tenant (f.eks. Gange-Rolv AS)
        └── chain_manager (SPAR / EUROSPAR / JOKER)
              └── store_manager (enkeltbutikk)
                    └── store_employee (begrenset tilgang)
```

Hvert nivå arver nedover og kan delegere innenfor egne rammer. Kjeden setter rammer, butikk fyller innhold innenfor rammene. Super_admin kan alltid overstyre alt.

---

## 3. Zone-basert skjermmodell

Skjermen deles i **soner** (zones). Kjeden definerer soneoppsettet per skjermtype. Butikken fyller sonene med moduler.

### Standard sonetyper
| Sone | Beskrivelse | Størrelse |
|------|-------------|-----------|
| `main` | Primær innholdssone | 2/3 av skjermen |
| `sidebar` | Sekundær sone (vær, info) | 1/3 høyre |
| `ticker` | Rullende tekstbanner | Full bredde, bunn |
| `logo` | Kjedelogo + klokke | Øverst høyre |

### Sone-layout-konfigurasjoner (kjeden velger)
- **Standard** — main + sidebar + ticker
- **Fullskjerm** — én sone tar alt
- **Split** — to like store soner
- **Quad** — fire like soner (bakrom/intern)
- **Custom** — egendefinert grid (kun super_admin)

---

## 4. Modul-register (ingen hardkoding)

Alle moduler bor i tabellen `module_registry` i databasen. Nye moduler legges til som datarader — ingen kodedeployment nødvendig. Hver modul har:

```
module_registry {
  id, slug, name, description, category,
  config_schema (jsonb),   -- hvilke felt modulen trenger
  renderer_component,       -- navn på React-komponent
  min_zone_size,            -- hvilke soner den passer i
  tenant_selectable         -- kan tenants aktivere/deaktivere
}
```

### Fase 1 — 12 kjernemoduler (MVP)

**Retail & Pris**
- `offer-card` — Ukenstilbud: produktnavn, pris, bilde, gyldighetsdato
- `weekly-menu` — Ukemeny: 5 middager, ingredienser, totalpris

**Info & Service**
- `weather` — Vær: Yr-integrasjon, lokasjon fra butikk-data
- `opening-hours` — Åpningstider: faste + spesielle tider
- `clock` — Klokke/dato-widget

**Intern & Ansatte**
- `internal-news` — Interne nyheter fra kjeden til ansatte
- `bulletin-board` — Beskjed-tavle: ledelsen → ansatte
- `shift-schedule` — Vaktplan: hvem er på jobb i dag
- `sales-target` — Salgsmål & statistikk: dagens omsetning vs mål

**Engasjement**
- `competition` — Konkurranse: tittel, beskrivelse, nedtelling, QR-kode
- `qr-code` — Generisk QR-kode-widget

**Media**
- `slideshow` — Bildegalleri/slideshow: opplastede bilder med overgangseffekter

### Fase 2 — 14 moduler (post-MVP)
`video`, `news-feed` (RSS), `loyalty-program`, `instagram-wall`, `google-reviews`, `queue-status`, `trivia-quiz`, `product-spotlight`, `birthday-announcement`, `training-material`, `sustainability-info`, `custom-url` (iframe), `countdown-timer`, `seasonal-items`

### Fase 3 — 10+ moduler (integrasjoner)
`pos-live-price`, `pos-stock`, `waste-tracker`, `power-bi`, `google-calendar`, `webhook-feed`, `public-transport`, `youtube-stream`, `trumf-loyalty`, `ms-teams-status`

---

## 5. Admin-UX design

### Designprinsipper
- **Lys & merkevare**: Hvit/lys grå bakgrunn, kjedens primærfarge som aksentfarge
- Kjedefarger: SPAR `#007B40`, EUROSPAR `#E30613`, JOKER `#F7A600`
- Tailwind CSS 4 custom tokens — kjedefarge injiseres som CSS-variabel `--color-brand`
- Geist font (allerede installert)
- Alle admin-flater er mobilresponsive

### Navigasjonsstruktur

**Sidebar (venstre, fast)**
```
[Logo + Kjedenavn]
─────────────────
Dashboard
─── Innhold
    ├── Modulbibliotek
    ├── Playlister
    └── Publiseringskalender
─── Skjermer
    ├── Oversikt (live kart)
    └── Fjernstyring
─── Butikker & Tags
─── Brukere
─── Innstillinger
    ├── Modulkatalog (super_admin)
    ├── Sone-editor (kjede)
    └── Enhetsregistrering
```

### Dashboard — rolle-tilpasset visning
Hvert rollenivå ser tilpasset dashboard:

- **super_admin**: Alle tenanter, system-helse, modul-bruksstatistikk
- **chain_manager**: Alle butikker i kjeden, godkjenningskø, live skjermkart
- **store_manager**: Egne skjermer, hurtighandlinger, kommende publiseringer
- **store_employee**: Kun egne skjermer og enkel innholdsoppretting

Dashboardet viser alltid:
- Live status per skjerm (grønn/gul/rød)
- Antall i godkjenningskø
- Neste planlagte publisering
- Siste aktivitetslogg

---

## 6. Innholdsbygger (visuell drag-and-drop)

### Brukerflyt
```
1. Klikk "Nytt innhold" (eller åpne eksisterende)
2. Velg sonetemplate (arves fra kjeden, låst for butikk)
3. Dra moduler fra venstrepaletten inn i soner
4. Fyll inn modulens felt (inline, høyrepanel)
5. Live forhåndsvisning oppdateres i sanntid (høyre halvdel)
6. Lagre utkast / Send til godkjenning
```

### Byggeren — teknisk
- Venstre: Modulpalette med aktiverte moduler (filtrert per rolle)
- Midten: Skjerm-canvas med droppbare sonebokser
- Høyre: Live forhåndsvisning (eksakt 16:9-skalert skjermvisning)
- Inline field-editor vises ved klikk på modul i canvas
- `@dnd-kit/core` for drag-and-drop
- Forhåndsvisning renderer er identisk komponent som `/screen/[token]`

### Forhåndsvisnings-modi
- **Desktop preview**: 16:9 skalert til 800px bredde
- **Tablet preview**: 4:3 format
- **Fullscreen preview**: Åpner ny fane som simulerer skjermen live

---

## 7. Publiseringsflyt

### Statuser og tillatelser

| Status | Opprettet av | Kan publisere |
|--------|-------------|---------------|
| `draft` | Alle roller | Nei |
| `pending_approval` | store_manager | Nei |
| `approved` | chain_manager / super_admin | Ja |
| `scheduled` | chain_manager / super_admin | Automatisk |
| `live` | System | Nei (kan deaktiveres) |
| `rejected` | chain_manager / super_admin | Nei |
| `archived` | Alle | Nei |

### Publiseringsveier
1. **Direktepublisering** (super_admin / chain_manager): Lag → Godkjenn → Publiser nå
2. **Godkjenningsflyt** (store_manager): Lag → Send til godkjenning → Kjede godkjenner → Live
3. **Planlagt publisering**: Sett dato/tid → System publiserer automatisk
4. **Umiddelbar tilbaketrekking**: Én-klikks deaktivering fra skjermoversikt

### Targeting (hvem ser innholdet)
- **Alle** i tenanten
- **Kjede**: én eller flere kjeder (SPAR, EUROSPAR, JOKER)
- **Tag**: geo/type-gruppe (Sunnmøre, Nordfjord, Storby, Øybutikk)
- **Enkeltbutikk**: spesifikk butikk
- **Skjerm**: én spesifikk skjerm (override)

### Propagering til skjermer
Når innhold publiseres:
1. `content_items.status` settes til `live`
2. Raspberry Pi-agent poller `/rpc/screen_poll` hvert 30. sekund
3. Agent mottar oppdatert playlist-hash
4. Chromium reloader `/screen/[token]` med nytt innhold
5. Maks 30 sekunder fra publisering til synlig på skjerm

### Angre / rollback
- Alle publiseringsoperasjoner logges i `publish_log`
- `previous_state jsonb` lagrer snapshot av `content_items`-raden FØR endringen (ikke en diff) — dette gjør rollback til én SQL UPDATE
- "Angre siste publisering" tilgjengelig i 24 timer via knapp i publiseringsloggen
- Versjonskontroll: `content_items.version` inkrementeres ved hvert lagre. `parent_version_id` peker på forrige versjon. Fullstendig historikk tilgjengelig for chain_manager+

---

## 8. Skjermoversikt — live kart

### Funksjonalitet
- Grid-visning av alle skjermer med live status (polling hvert 10. sek via Supabase Realtime)
- Fargekoding: grønn (online), gul (advarsel/gammel heartbeat), rød (offline)
- Klikk på skjerm → slide-over med detaljer + fjernkontroll
- Filtrer etter kjede / tag / status

### Fjernstyring per skjerm
- Reload innhold (oppdater uten reboot)
- Skjerm AV/PÅ (HDMI-CEC via Pi-agenten)
- Reboot Pi
- Åpne live preview i ny fane
- Se siste heartbeat, IP, app-versjon

---

## 9. Databaseendringer (utvidelser av eksisterende schema)

### Nye tabeller

```sql
-- Modul-register
module_registry (
  id uuid PK,
  slug text UNIQUE,           -- 'offer-card', 'weather', etc.
  name text,
  description text,
  category text,              -- 'retail', 'info', 'internal', etc.
  config_schema jsonb,        -- JSON Schema for modulens felt
  renderer_component text,    -- 'OfferCardModule', 'WeatherModule', etc.
                              -- Brukes av lib/modules/renderer.ts til dynamic import:
                              -- const Mod = await import(`@/components/modules/${slug}`)
                              -- Alle fase-1 moduler er statisk importert; fase-2+ lazy
  phase int DEFAULT 1,        -- 1=MVP, 2=post-MVP, 3=integrasjoner
  is_active boolean DEFAULT true
)

-- Hvilke moduler er aktivert per tenant
tenant_modules (
  tenant_id uuid FK,
  module_slug text FK,
  enabled_at timestamptz,
  config_override jsonb        -- tenant-spesifikk konfig
)

-- Sone-layout-definisjoner per kjede
zone_layouts (
  id uuid PK,
  chain_id uuid FK,            -- NULL = tenant-default
  name text,
  layout_config jsonb,         -- {zones: [{id, gridArea, allowedCategories}]}
  is_default boolean
)

-- Publiseringslogg for angre/historikk
publish_log (
  id uuid PK,
  content_item_id uuid FK,
  action text,                 -- 'published', 'unpublished', 'rolled_back'
  actor_id uuid FK,
  previous_state jsonb,
  created_at timestamptz
)
```

### Endringer i eksisterende tabeller

```sql
-- content_items: legg til zone-konfigurasjon og versjonering
ALTER TABLE content_items ADD COLUMN zone_layout_id uuid REFERENCES zone_layouts;
ALTER TABLE content_items ADD COLUMN version int DEFAULT 1;
ALTER TABLE content_items ADD COLUMN parent_version_id uuid REFERENCES content_items;

-- screens: legg til Supabase Realtime-vennlig heartbeat
ALTER TABLE screens ADD COLUMN realtime_channel text; -- for Supabase Realtime broadcast
```

---

## 10. Teknisk arkitektur — nye komponenter

### Frontend (Next.js App Router)

```
src/
├── app/
│   ├── admin/
│   │   ├── content/
│   │   │   ├── builder/          -- Innholdsbygger (visuell drag-and-drop)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── ZoneCanvas.tsx
│   │   │   │   ├── ModulePalette.tsx
│   │   │   │   └── LivePreview.tsx
│   │   │   ├── calendar/         -- Publiseringskalender
│   │   │   └── library/          -- Modulbibliotek (alle innholdsitems)
│   │   ├── screens/
│   │   │   ├── map/              -- Live skjermkart
│   │   │   └── [id]/             -- Enkeltskjerm + fjernstyring
│   │   └── settings/
│   │       ├── modules/          -- Modulkatalog (super_admin)
│   │       └── zone-editor/      -- Sone-editor (kjede)
│   └── screen/
│       └── [token]/
│           └── ZoneRenderer.tsx  -- Renderer brukt av BÅDE preview og live skjerm
├── components/
│   ├── modules/                  -- Én fil per modul
│   │   ├── OfferCardModule.tsx
│   │   ├── WeatherModule.tsx
│   │   ├── ClockModule.tsx
│   │   └── ... (12 fase-1 moduler)
│   ├── builder/
│   │   ├── DraggableModule.tsx
│   │   ├── DroppableZone.tsx
│   │   └── PreviewFrame.tsx
│   └── admin/
│       ├── PublishPanel.tsx      -- Publiseringspanel (mål + tid + knapper)
│       ├── ApprovalQueue.tsx     -- Godkjenningskø
│       └── ScreenStatusDot.tsx  -- Live-status-indikator
└── lib/
    ├── modules/
    │   ├── registry.ts           -- Henter modul-registry fra DB
    │   └── renderer.ts           -- Dynamisk modul-render-logikk
    └── realtime/
        └── screens.ts            -- Supabase Realtime for screen-status
```

### Nøkkelprinsipp: én renderer, to kontekster
`ZoneRenderer` brukes identisk i:
- `/screen/[token]` — live skjermvisning på Raspberry Pi
- `LivePreview` i innholdsbyggeren — forhåndsvisning i admin

Dette garanterer at "hva du ser er hva skjermen viser" — ingen overraskelser.

---

## 11. Sprint-plan

### Sprint 1 — Fundament & designsystem (uke 1–2)
**Mål:** Nytt admin-designsystem live, alle eksisterende sider migrert til lys/merkevare-tema

- [ ] Tailwind-tema med CSS-variabler for kjedefarger (`--color-brand`)
- [ ] Oppdatert sidebar, topbar og layout til lys/merkevare-design
- [ ] Alle 12 admin-sider koblet til ekte Supabase-data (fjern mock-data)
- [ ] Rolle-basert navigasjon (hvert rollenivå ser kun relevante sider)
- [ ] Supabase Realtime for live skjermstatus (grønn/gul/rød dot)
- [ ] Rolle-tilpasset dashboard med live tall

### Sprint 2 — Databaseutvidelse & modul-register (uke 3)
**Mål:** Modul-arkitektur på plass, ingen hardkoding

- [ ] Migrasjoner: `module_registry`, `tenant_modules`, `zone_layouts`, `publish_log`
- [ ] Seed 12 fase-1 moduler i `module_registry`
- [ ] Seed standard sone-layouts for SPAR/EUROSPAR/JOKER
- [ ] Oppdatert `content_items` med zone-konfigurasjon og versjonering
- [ ] TypeScript-typer regenerert

### Sprint 3 — Innholdsbygger MVP (uke 4–5)
**Mål:** Drag-and-drop innholdsbygger med live forhåndsvisning fungerer ende-til-ende

- [ ] `ZoneCanvas` med droppbare soner (`@dnd-kit/core`)
- [ ] `ModulePalette` — viser aktiverte moduler, filtrerbar per kategori
- [ ] Inline field-editor for hver modul (konfig-schema-drevet)
- [ ] `LivePreview` — identisk renderer som `/screen/[token]`
- [ ] Lagre utkast til Supabase i sanntid (autosave hvert 30. sek)
- [ ] Implementer alle 12 fase-1 modul-komponenter

### Sprint 4 — Publiseringsflyt & godkjenning (uke 6)
**Mål:** Komplett flyt fra utkast til live skjerm

- [ ] `PublishPanel` — målretting (kjede/tag/butikk/alle) + tidspicker
- [ ] Godkjenningskø med varslinger (e-post + in-app notifikasjon)
- [ ] Planlagt publisering (cron-job via Supabase Edge Function)
- [ ] Angre/rollback med `publish_log`
- [ ] Fullskjerm preview-modus (ny fane, simulerer skjerm live)
- [ ] 30-sekunders propagering: publish → screen_poll → reload

### Sprint 5 — Skjermkart & fjernstyring (uke 7)
**Mål:** Live oversikt og full kontroll over alle skjermer

- [ ] Live skjermkart med Supabase Realtime (grønn/gul/rød)
- [ ] Slide-over panel per skjerm: status, heartbeat, fjernstyring
- [ ] Forbedret Pi-agent: raskere polling (15 sek), bedre feilhåndtering
- [ ] Bulk-handlinger: reload alle, skjerm av/på for kjede/tag

### Sprint 6 — Sone-editor & tenant-oppsett (uke 8)
**Mål:** Kjeder kan konfigurere egne sone-layouts uten kodeendring

- [ ] Visuell sone-editor for kjedeansvarlig
- [ ] Tenant-modul-aktivering (super_admin aktiverer, tenant velger)
- [ ] Tenant-onboarding-flyt (ny tenant uten manuell kodeendring)
- [ ] White-label fargetema per tenant

### Sprint 7 — Fase 2 moduler + kalender (uke 9–10)
**Mål:** 14 nye moduler + publiseringskalender

- [ ] Publiseringskalender (uke/måned-visning, drag-and-drop)
- [ ] Fase-2 moduler: `video`, `news-feed`, `instagram-wall`, `google-reviews`, `trivia-quiz`, `loyalty-program`, `countdown-timer`, `queue-status`, `birthday-announcement`, `training-material`, `product-spotlight`, `seasonal-items`, `custom-url`, `sustainability-info`

---

## 12. UX-krav som ikke skal kompromisses

1. **Live preview er alltid synlig** under redigering — aldri split-screen skjult
2. **Publiser-knappen** er alltid tilgjengelig uten å scrolle
3. **Godkjenningsvarsling** skal nå kjedeleder innen 30 sek (Supabase Realtime)
4. **Angre** er alltid tilgjengelig etter publisering (minst 24 timer)
5. **Nullklikk til status**: dashboardet viser live skjermstatus uten refresh
6. **Mobilvennlig**: butikksjef kan godkjenne og publisere fra telefon
7. **Tom-tilstand**: alle lister har meningsfulle "ingen innhold ennå"-meldinger med handlingsknapp
8. **Feil-tilstand**: alle API-feil vises som brukervennlige meldinger, aldri tekniske stack traces

---

## 13. Hva som ikke er i scope (bevisst utelatt)

- AI-assistert innholdsproduksjon (planlagt fase 4)
- POS-integrasjoner (planlagt fase 3)
- Mobilapp for butikkansatte (planlagt fase 4)
- Betaling/abonnement-håndtering (planlagt ved SaaS-lansering)
- Custom sone-editor for super_admin (CSS grid builder) — bruker predefinerte layouts i fase 1
