-- Slå på kampanjekort-bygger (liggende premium plakat-mal) for tenants som IKKE
-- er dagligvare (dvs. ikke har varekort/offerCards). F.eks. bilforhandlere som
-- Mobile AS får «Bygg kampanjekort» i editoren; dagligvare bruker varekort i stedet.
update public.tenants
set features = features || '{"campaignCards": true}'::jsonb
where not (features ? 'offerCards');
