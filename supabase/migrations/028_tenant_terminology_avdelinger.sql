-- Gjør terminologi og avdelinger tenant-styrt, så en bilforhandler-tenant kan
-- si «Forhandler» i stedet for «Butikk» og ha bil-avdelinger i stedet for mat.
--
-- unit_label / unit_label_plural: substantivet for en enhet (Butikk/Forhandler).
-- avdelinger: jsonb-array av { key, label }. Første oppføring bør være «felles»
-- (hele enheten). Widgets/editor leser denne i stedet for den hardkodede lista.

alter table public.tenants
  add column if not exists unit_label text not null default 'Butikk',
  add column if not exists unit_label_plural text not null default 'Butikker',
  add column if not exists avdelinger jsonb not null default '[
    {"key":"felles","label":"Hele butikken"},
    {"key":"frukt","label":"Frukt & grønt"},
    {"key":"ferskvare","label":"Ferskvare"},
    {"key":"frys","label":"Frys"},
    {"key":"bakeri","label":"Bakeri"},
    {"key":"kjott-fisk","label":"Kjøtt & fisk"},
    {"key":"kasse","label":"Kasse"},
    {"key":"inngang","label":"Inngang"}
  ]'::jsonb,
  add column if not exists org_nr text,
  add column if not exists phone text,
  add column if not exists address text;

-- Eksisterende tenant(er) beholder mat-avdelingene (default over) — eksplisitt
-- for tydelighet på den som finnes i dag.
update public.tenants
set avdelinger = '[
  {"key":"felles","label":"Hele butikken"},
  {"key":"frukt","label":"Frukt & grønt"},
  {"key":"ferskvare","label":"Ferskvare"},
  {"key":"frys","label":"Frys"},
  {"key":"bakeri","label":"Bakeri"},
  {"key":"kjott-fisk","label":"Kjøtt & fisk"},
  {"key":"kasse","label":"Kasse"},
  {"key":"inngang","label":"Inngang"}
]'::jsonb
where unit_label = 'Butikk';
