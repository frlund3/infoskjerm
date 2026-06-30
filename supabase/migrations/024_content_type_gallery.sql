-- Galleri som innholdstype: råflott overskrift + galleri av varer (bilde, navn,
-- pris, prisinfo) + valgfri QR. Brukes på kundeskjerm (catering/meny) og bakrom
-- (ansattilbud) — samme type, ulikt tema.
alter type content_type add value if not exists 'gallery';
