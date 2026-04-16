-- Rolling back the push-notifications scaffolding. Deferring to v2.
DROP TABLE IF EXISTS "device_tokens";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."device_platform";
