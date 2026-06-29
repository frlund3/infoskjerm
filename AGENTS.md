# Infoskjerm — Nordstjerne (LES FØRST)

**Live kode = `main`.** Xibo (self-hosted, Hetzner) er motoren; appen er innholdseditor + `/widget/*`-sider som Xibo embedder. Kilde til sannhet for status/plan: **`SPRINTS.md`** (repo-rot).

⚠️ **Det gamle modulsystemet er SLETTET** (commit `fd22ecf`): `module_registry`, zone-builder, drag-and-drop innholdsbygger, `/screen/[token]`-player, «25 moduler» (Fase 1/2/3). **Ikke gjenoppliv det.**
- Docs datert **2026-06-28** under `docs/superpowers/` beskriver den forlatte arkitekturen — **IGNORER dem** (se `docs/superpowers/README.md`).
- En `EnterWorktree` «fresh» branchet tidligere fra en forlatt default-branch og landet på død kode — default er nå `main`.

**Faktisk arkitektur:**
- Innholdstyper: `src/app/admin/innhold/actions.ts` → `news | competition | stats | weather | slide | job | birthday | ticker` (delt kunde/intern via `audience.ts`).
- Levering: `/widget/*`-sider (`tilbud`, `nyheter`, `vaer`, `butikk-kpi`, `kpi-oversikt`, `topbar`) embeddes av Xibo. Xibo-klient: `src/lib/xibo/`.
- Ny widget: lag `/widget/<navn>` (leser Supabase, `?store=`) → kjør `scripts/xibo/build-widget-layout.mjs` mot butikkens skjermgruppe.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
