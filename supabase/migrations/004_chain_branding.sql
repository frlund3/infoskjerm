-- Sprint 6: white-label fargetema per kjede
ALTER TABLE chains
  ADD COLUMN IF NOT EXISTS brand_light text DEFAULT '#d1fae5',
  ADD COLUMN IF NOT EXISTS brand_fg    text DEFAULT '#ffffff';
