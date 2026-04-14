-- Wipe all user-owned data so the app starts fresh under Clerk.
--
-- Run this once after the Clerk swap, against the Neon Postgres database.
-- Every domain table FKs back to `moves` with ON DELETE CASCADE, so a single
-- DELETE on `moves` clears: rooms, items, item_photos, boxes, box_items,
-- checklist_items. The global `item_categories` seed data is preserved.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/wipe-user-data.sql
--
-- Note: orphaned Vercel Blob photos (referenced by item_photos.blob_pathname)
-- will remain in Blob storage. For a small personal dataset this is fine —
-- they cost ~nothing and can be cleaned up later via the Vercel dashboard.

BEGIN;

DELETE FROM moves;

-- Sanity check: confirm cascade cleared everything user-owned.
SELECT 'moves'           AS table_name, COUNT(*) AS remaining FROM moves
UNION ALL SELECT 'rooms',           COUNT(*) FROM rooms
UNION ALL SELECT 'items',           COUNT(*) FROM items
UNION ALL SELECT 'item_photos',     COUNT(*) FROM item_photos
UNION ALL SELECT 'boxes',           COUNT(*) FROM boxes
UNION ALL SELECT 'box_items',       COUNT(*) FROM box_items
UNION ALL SELECT 'checklist_items', COUNT(*) FROM checklist_items
UNION ALL SELECT 'item_categories (kept)', COUNT(*) FROM item_categories;

-- All "remaining" counts should be 0 except item_categories.
COMMIT;
