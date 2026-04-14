CREATE TYPE "public"."move_role" AS ENUM('owner', 'editor', 'helper');
--> statement-breakpoint
CREATE TABLE "move_members" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "move_role" NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "move_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"move_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "move_role" NOT NULL,
	"token" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "move_members" ADD CONSTRAINT "move_members_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "move_invitations" ADD CONSTRAINT "move_invitations_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "move_members_unique" ON "move_members" USING btree ("move_id","user_id");
--> statement-breakpoint
CREATE INDEX "move_members_user_idx" ON "move_members" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "move_invitations_token_unique" ON "move_invitations" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "move_invitations_move_idx" ON "move_invitations" USING btree ("move_id");
--> statement-breakpoint
-- Backfill: every existing move gets its owner_user_id mirrored into move_members.
INSERT INTO "move_members" ("id", "move_id", "user_id", "role", "added_at")
SELECT
  'mmb_' || substr(md5(random()::text || id), 1, 10),
  id,
  owner_user_id,
  'owner',
  NOW()
FROM "moves"
ON CONFLICT ("move_id", "user_id") DO NOTHING;
