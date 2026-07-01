-- Privat kiosk-visning: valgfritt passord per enhet (butikk/forhandler).
--
-- Når `kiosk_password_hash` er satt, krever /vis/<enhet> at man skriver passordet
-- for å se skjermen (skjuler den for konkurrenter/uvedkommende). Lagres som
-- scrypt-hash (salt:hash), aldri i klartekst. Null = åpen visning (som før).

alter table public.stores
  add column if not exists kiosk_password_hash text;
