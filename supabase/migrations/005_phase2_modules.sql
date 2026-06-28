-- Sprint 7: Fase 2-moduler
INSERT INTO module_registry (key, name, category, description, icon, schema) VALUES

('video', 'Video', 'media',
 'Spill av en video-URL på fullskjerm.',
 'Video',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":false},{"key":"video_url","label":"Video-URL (mp4/YouTube)","type":"text","required":true},{"key":"autoplay","label":"Autoplay","type":"select","options":["ja","nei"],"required":false}]}'::jsonb),

('news-feed', 'Nyhetsfeed', 'informasjon',
 'Viser overskrifter fra en RSS/JSON-feed.',
 'Rss',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":false},{"key":"feed_url","label":"Feed URL","type":"text","required":true},{"key":"max_items","label":"Antall nyheter","type":"number","required":false}]}'::jsonb),

('instagram-wall', 'Instagram-vegg', 'media',
 'Viser et rutenett av Instagram-bilder.',
 'Instagram',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":false},{"key":"username","label":"Instagram-brukernavn","type":"text","required":true},{"key":"hashtag","label":"Hashtag (alternativ)","type":"text","required":false}]}'::jsonb),

('google-reviews', 'Google-anmeldelser', 'informasjon',
 'Viser siste Google-anmeldelser for butikken.',
 'Star',
 '{"fields":[{"key":"business_name","label":"Virksomhetsnavn","type":"text","required":true},{"key":"min_rating","label":"Minimumsrangering (1-5)","type":"number","required":false}]}'::jsonb),

('trivia-quiz', 'Trivia-quiz', 'underholdning',
 'Viser et trivia-spørsmål med svaralternativer.',
 'HelpCircle',
 '{"fields":[{"key":"question","label":"Spørsmål","type":"text","required":true},{"key":"answer_a","label":"Svar A","type":"text","required":true},{"key":"answer_b","label":"Svar B","type":"text","required":true},{"key":"answer_c","label":"Svar C","type":"text","required":false},{"key":"answer_d","label":"Svar D","type":"text","required":false},{"key":"correct","label":"Riktig svar (A/B/C/D)","type":"select","options":["A","B","C","D"],"required":true},{"key":"reveal_after","label":"Vis svar etter (sek)","type":"number","required":false}]}'::jsonb),

('loyalty-program', 'Lojalitetsprogram', 'salg_tilbud',
 'Viser informasjon om lojalitetsprogram eller fordelsclub.',
 'Award',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":true},{"key":"description","label":"Beskrivelse","type":"textarea","required":true},{"key":"points_label","label":"Poengetikett","type":"text","required":false},{"key":"cta","label":"Call-to-action tekst","type":"text","required":false},{"key":"image_url","label":"Bilde-URL","type":"image","required":false}]}'::jsonb),

('countdown-timer', 'Nedtelling', 'underholdning',
 'Teller ned til et arrangement, lansering eller hendelse.',
 'Timer',
 '{"fields":[{"key":"title","label":"Hva teller vi ned til?","type":"text","required":true},{"key":"target_date","label":"Dato og tid","type":"date","required":true},{"key":"subtitle","label":"Undertittel","type":"text","required":false}]}'::jsonb),

('queue-status', 'Kø-status', 'informasjon',
 'Viser aktuelt kønummer og estimert ventetid.',
 'Users',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":false},{"key":"current_number","label":"Nåværende nummer","type":"number","required":true},{"key":"serving","label":"Betjener nå","type":"number","required":true},{"key":"wait_minutes","label":"Estimert vente (min)","type":"number","required":false}]}'::jsonb),

('birthday-announcement', 'Bursdagshilsen', 'intern_info',
 'Feirer ansatte med bursdag i dag.',
 'Cake',
 '{"fields":[{"key":"name","label":"Navn","type":"text","required":true},{"key":"message","label":"Hilsen","type":"textarea","required":false},{"key":"image_url","label":"Bilde-URL","type":"image","required":false}]}'::jsonb),

('product-spotlight', 'Produktrampelys', 'salg_tilbud',
 'Fremhever ett produkt med pris, detaljer og bilde.',
 'Sparkles',
 '{"fields":[{"key":"product_name","label":"Produktnavn","type":"text","required":true},{"key":"description","label":"Beskrivelse","type":"textarea","required":false},{"key":"price","label":"Pris","type":"text","required":false},{"key":"original_price","label":"Opprinnelig pris","type":"text","required":false},{"key":"image_url","label":"Produktbilde-URL","type":"image","required":false},{"key":"badge","label":"Badge (f.eks. NYHET, TILBUD)","type":"text","required":false}]}'::jsonb),

('seasonal-items', 'Sesongvarer', 'salg_tilbud',
 'Viser sesongaktuelt sortiment eller kampanje.',
 'Leaf',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":true},{"key":"season","label":"Sesong","type":"select","options":["Vår","Sommer","Høst","Vinter","Påske","Jul","17.mai"],"required":false},{"key":"description","label":"Beskrivelse","type":"textarea","required":false},{"key":"image_url","label":"Bilde-URL","type":"image","required":false}]}'::jsonb),

('custom-url', 'Egendefinert nettside', 'media',
 'Bygger inn en nettside i en iframe på skjermen.',
 'Globe',
 '{"fields":[{"key":"url","label":"URL","type":"text","required":true},{"key":"title","label":"Tittel (vises kun i admin)","type":"text","required":false},{"key":"zoom","label":"Zoom-faktor (%)","type":"number","required":false}]}'::jsonb),

('sustainability-info', 'Bærekraft', 'informasjon',
 'Viser bærekraftsmål, CO₂-statistikk eller miljøfakta.',
 'Leaf',
 '{"fields":[{"key":"title","label":"Tittel","type":"text","required":true},{"key":"metric","label":"Nøkkeltall","type":"text","required":false},{"key":"metric_label","label":"Forklaring av nøkkeltall","type":"text","required":false},{"key":"description","label":"Beskrivelse","type":"textarea","required":false},{"key":"goal","label":"Mål","type":"text","required":false},{"key":"image_url","label":"Bilde-URL","type":"image","required":false}]}'::jsonb)

ON CONFLICT (key) DO NOTHING;
