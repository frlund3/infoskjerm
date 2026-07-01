# Infoskjerm — Nordstjerne (LES FØRST)

**Live kode = `main`.** Xibo (self-hosted, Hetzner) er motoren; appen er innholdseditor + `/widget/*`-sider som Xibo embedder. Kilde til sannhet for status/plan: **`SPRINTS.md`** (repo-rot).

⚠️ **Det gamle modulsystemet er SLETTET** (commit `fd22ecf`): `module_registry`, zone-builder, drag-and-drop innholdsbygger, `/screen/[token]`-player, «25 moduler» (Fase 1/2/3). **Ikke gjenoppliv det.**
- Docs datert **2026-06-28** under `docs/superpowers/` beskriver den forlatte arkitekturen — **IGNORER dem** (se `docs/superpowers/README.md`).
- En `EnterWorktree` «fresh» branchet tidligere fra en forlatt default-branch og landet på død kode — default er nå `main`.

**Faktisk arkitektur:**
- Innholdstyper: `src/app/admin/innhold/actions.ts` → `news | competition | stats | weather | slide | job | birthday | ticker` (delt kunde/intern via `audience.ts`).
- Levering: `/widget/*`-sider (`tilbud`, `nyheter`, `vaer`, `butikk-kpi`, `kpi-oversikt`, `topbar`) embeddes av Xibo. Xibo-klient: `src/lib/xibo/`.
- Ny widget: lag `/widget/<navn>` (leser Supabase, `?store=`) → kjør `scripts/xibo/build-widget-layout.mjs` mot butikkens skjermgruppe.

**Fysiske skjermer (Raspberry Pi):** enhetsregister = **`docs/raspberry-enheter.md`** (kilden til sannhet for flåten); oppsett-oppskrift = `docs/oppsett-raspberrypi.md`. Xibo-serveren: root via `ssh root@157.180.73.205`.

**DB-migrasjoner — bruk timestamp-prefiks (IKKE `NNN_`):** flere agenter jobber parallelt, og `NNN_`-nummerering kolliderer (to agenter velger samme neste-nummer → duplikat `version`-nøkkel → Supabase preview-branches feiler). Nye migrasjoner: **`YYYYMMDDHHMMSS_beskrivelse.sql`** (Supabase-standard, kolliderer aldri). De eksisterende `NNN_`-filene med duplikater (032/033/035/036/037) beholdes som de er — prod-skjemaet er komplett og korrekt, og repoets migrasjonshistorikk er allerede frakoblet prod (prod bruker timestamps). Ikke renummer historiske migrasjoner (skaper konflikter med parallelle grener uten nytte).

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
