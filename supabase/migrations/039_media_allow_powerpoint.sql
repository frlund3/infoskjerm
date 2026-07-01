-- supabase/migrations/039_media_allow_powerpoint.sql
-- Tillat PowerPoint (.pptx/.ppt) i media-bucketen. Uten dette avviste Storage
-- opplasting med «415 invalid_mime_type», og editorens opplaster hang uendelig.
-- Editor + render-decks-workflow støtter allerede PowerPoint (isDeckUrl/isPptUrl).
-- Setter hele lista eksplisitt slik at migrasjonene matcher live-konfigen.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'
]
WHERE id = 'media';
