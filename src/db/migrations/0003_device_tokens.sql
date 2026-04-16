CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android', 'web');
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"token" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_unique" ON "device_tokens" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" USING btree ("user_id");
