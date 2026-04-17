-- Box types become a per-move CRUD table, replacing the hardcoded `box_size`
-- enum. `boxes.fragile` becomes a free-form `tags` array so users can mark
-- boxes as fragile, perishable, and/or live animal.

-- 1. Create the box_types table.
CREATE TABLE "box_types" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"key" text,
	"label" text NOT NULL,
	"volume_cu_ft" numeric(6, 3),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "box_types" ADD CONSTRAINT "box_types_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "box_types_move_label_idx" ON "box_types" USING btree ("move_id","label");
--> statement-breakpoint
CREATE INDEX "box_types_move_idx" ON "box_types" USING btree ("move_id","sort_order");
--> statement-breakpoint

-- 2. Seed the six default types for every existing move. Deterministic IDs
--    by (move_id, key) make the join in step 4 straightforward.
INSERT INTO "box_types" ("id", "move_id", "key", "label", "volume_cu_ft", "sort_order")
SELECT 'boxtyp_' || m.id || '_' || d.key, m.id, d.key, d.label, d.volume_cu_ft, d.sort_order
FROM "moves" m
CROSS JOIN (VALUES
	('small',     'Small (1.5 cuft)',     1.500,  10),
	('medium',    'Medium (3.0 cuft)',    3.000,  20),
	('large',     'Large (4.5 cuft)',     4.500,  30),
	('dish_pack', 'Dish pack (5.2 cuft)', 5.200,  40),
	('wardrobe',  'Wardrobe (11 cuft)',  11.000,  50),
	('tote',      'Tote (2.4 cuft)',      2.400,  60)
) AS d(key, label, volume_cu_ft, sort_order);
--> statement-breakpoint

-- 3. Add box_type_id to boxes (nullable for backfill).
ALTER TABLE "boxes" ADD COLUMN "box_type_id" text;
--> statement-breakpoint

-- 4. Populate box_type_id by matching each box's old size to the seeded
--    default type for its move.
UPDATE "boxes" b
SET "box_type_id" = bt.id
FROM "box_types" bt
WHERE bt.move_id = b.move_id AND bt.key = b.size::text;
--> statement-breakpoint

-- 5. Enforce NOT NULL and add the FK.
ALTER TABLE "boxes" ALTER COLUMN "box_type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_box_type_id_box_types_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."box_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- 6. Drop the old size column.
ALTER TABLE "boxes" DROP COLUMN "size";
--> statement-breakpoint

-- 7. Add tags array, backfill from fragile, drop fragile.
ALTER TABLE "boxes" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
UPDATE "boxes" SET "tags" = ARRAY['fragile']::text[] WHERE "fragile" = true;
--> statement-breakpoint
ALTER TABLE "boxes" DROP COLUMN "fragile";
--> statement-breakpoint

-- 8. Convert item_categories.recommended_box_type from enum to text.
--    Existing slug values are preserved.
ALTER TABLE "item_categories"
	ALTER COLUMN "recommended_box_type" TYPE text USING "recommended_box_type"::text;
--> statement-breakpoint

-- 9. Drop the now-unused enums.
DROP TYPE IF EXISTS "public"."box_size";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."box_type";
