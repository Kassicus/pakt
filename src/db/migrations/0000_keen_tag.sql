CREATE TYPE "public"."box_size" AS ENUM('small', 'medium', 'large', 'dish_pack', 'wardrobe', 'tote');--> statement-breakpoint
CREATE TYPE "public"."box_status" AS ENUM('empty', 'packing', 'sealed', 'loaded', 'in_transit', 'delivered', 'unpacked');--> statement-breakpoint
CREATE TYPE "public"."box_type" AS ENUM('small', 'medium', 'large', 'dish_pack', 'wardrobe', 'tote', 'none');--> statement-breakpoint
CREATE TYPE "public"."disposition" AS ENUM('undecided', 'moving', 'storage', 'donate', 'trash', 'sold');--> statement-breakpoint
CREATE TYPE "public"."fragility" AS ENUM('normal', 'fragile', 'very_fragile');--> statement-breakpoint
CREATE TYPE "public"."move_status" AS ENUM('planning', 'packing', 'in_transit', 'unpacking', 'done');--> statement-breakpoint
CREATE TYPE "public"."room_kind" AS ENUM('origin', 'destination');--> statement-breakpoint
CREATE TABLE "box_items" (
	"id" text PRIMARY KEY NOT NULL,
	"box_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "box_items_unique" UNIQUE("box_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "boxes" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"short_code" text NOT NULL,
	"size" "box_size" NOT NULL,
	"source_room_id" text,
	"destination_room_id" text,
	"status" "box_status" DEFAULT 'empty' NOT NULL,
	"fragile" boolean DEFAULT false NOT NULL,
	"weight_lbs_actual" numeric(6, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "item_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"volume_cu_ft_per_item" numeric(6, 3) NOT NULL,
	"weight_lbs_per_item" numeric(6, 2) NOT NULL,
	"recommended_box_type" "box_type" NOT NULL,
	"fragile" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"width" integer,
	"height" integer,
	"byte_size" integer,
	"content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text,
	"source_room_id" text,
	"destination_room_id" text,
	"disposition" "disposition" DEFAULT 'undecided' NOT NULL,
	"fragility" "fragility" DEFAULT 'normal' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimated_value_usd" numeric(10, 2),
	"volume_cu_ft_override" numeric(6, 3),
	"weight_lbs_override" numeric(6, 2),
	"notes" text,
	"decision_answers" jsonb,
	"decision_score" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"origin_address" text,
	"destination_address" text,
	"planned_move_date" date,
	"status" "move_status" DEFAULT 'planning' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"kind" "room_kind" NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_unique_label" UNIQUE("move_id","kind","label")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "box_items" ADD CONSTRAINT "box_items_box_id_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_items" ADD CONSTRAINT "box_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_source_room_id_rooms_id_fk" FOREIGN KEY ("source_room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_destination_room_id_rooms_id_fk" FOREIGN KEY ("destination_room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."item_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_source_room_id_rooms_id_fk" FOREIGN KEY ("source_room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_destination_room_id_rooms_id_fk" FOREIGN KEY ("destination_room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "box_items_item_idx" ON "box_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "boxes_move_shortcode_idx" ON "boxes" USING btree ("move_id","short_code");--> statement-breakpoint
CREATE INDEX "boxes_move_status_idx" ON "boxes" USING btree ("move_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "items_move_disposition_idx" ON "items" USING btree ("move_id","disposition","deleted_at");--> statement-breakpoint
CREATE INDEX "items_move_source_room_idx" ON "items" USING btree ("move_id","source_room_id") WHERE "items"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "moves_owner_status_idx" ON "moves" USING btree ("owner_clerk_user_id","status");--> statement-breakpoint
CREATE INDEX "rooms_move_idx" ON "rooms" USING btree ("move_id","kind");