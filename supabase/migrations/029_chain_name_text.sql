-- chains.name var en enum (chain_type = {EUROSPAR,JOKER,SPAR}) — en Gange-Rolv-arv
-- som blokkerer andre tenants (f.eks. bilforhandler-kjeden «Mobile»). Kjede-farger
-- kommer uansett fra chains.color/brand_light/brand_fg, så navnet kan være fritekst.
alter table public.chains alter column name type text using name::text;
