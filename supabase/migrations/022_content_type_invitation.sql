-- Invitasjon som innholdstype (interne arrangement: julebord, sommerfest, kurs …)
-- med eget bilde, tekst, dato/sted og QR-kode til innebygd påmeldingsside.
alter type content_type add value if not exists 'invitation';
