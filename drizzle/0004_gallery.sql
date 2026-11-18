CREATE TABLE "gallery_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"content_hash" text DEFAULT '' NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitter_hash" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gallery_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_approve" boolean DEFAULT false NOT NULL,
	"blocked_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_settings_singleton" CHECK ("gallery_settings"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX "gallery_status_created_idx" ON "gallery_photos" USING btree ("status","created_at");