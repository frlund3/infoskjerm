-- Manuell rekkefølge på innhold (rotasjonsrekkefølge i widgetene).
--
-- Additiv og bakoverkompatibel: NULL = ingen manuell rekkefølge satt, og
-- innholdet faller da tilbake til published_at DESC (nøyaktig som før). Når en
-- redaktør drar for å sortere, settes sort_order = posisjon (0 = vises først).
-- Widget-spørringen ordner: sort_order ASC NULLS LAST, deretter published_at DESC.

alter table public.content_items
  add column if not exists sort_order integer;

comment on column public.content_items.sort_order is
  'Manuell visningsrekkefølge i widget (0 = først). NULL = fall tilbake til published_at DESC.';

create index if not exists content_items_sort_order_idx
  on public.content_items (sort_order)
  where sort_order is not null;
