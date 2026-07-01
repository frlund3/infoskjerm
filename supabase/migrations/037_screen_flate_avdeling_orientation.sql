-- Enhets-styrte skjermer: hver fysiske Pi (screens-rad, identifisert av token)
-- får flate (kunde|intern), avdeling og orientering. /skjerm/<token> rendrer
-- deretter riktig innhold. Endres i appen — Pi-en rører vi aldri igjen, og en ny
-- avdeling er bare en datarad (ingen omprogrammering).
alter table public.screens
  add column if not exists flate text not null default 'kunde',
  add column if not exists avdeling text not null default 'felles',
  add column if not exists orientation text not null default 'portrait';

-- Egne avdelinger for INTERNE skjermer (kunde-avdelinger ligger i tenants.avdelinger).
-- Individuelt per tenant, uavhengig av kunde-avdelingene.
alter table public.tenants
  add column if not exists avdelinger_intern jsonb not null default '[]'::jsonb;
