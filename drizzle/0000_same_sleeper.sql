CREATE TABLE "categories" (
	"name" text PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"egg" boolean DEFAULT false NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"temperatures" jsonb,
	"cold_extra" integer,
	"image" text,
	"rating" real,
	"reviews_count" integer,
	"prep_time" integer,
	"badge" text,
	"portion" text,
	"meal_time" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_items_price_nonneg" CHECK ("menu_items"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_counters" (
	"day" text NOT NULL,
	"last" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_counters_day_pk" PRIMARY KEY("day")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit" integer NOT NULL,
	"egg" boolean,
	"temp" text,
	"note" text,
	CONSTRAINT "order_items_qty_pos" CHECK ("order_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pickup_at" timestamp with time zone NOT NULL,
	"estimate" integer NOT NULL,
	"mode" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"note" text,
	"payment_status" text DEFAULT 'PENDING' NOT NULL,
	"fulfillment_status" text DEFAULT 'NEW' NOT NULL,
	"notification_status" text DEFAULT 'QUEUED' NOT NULL,
	"recipient_shift_id" text NOT NULL,
	"total" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancel_reason" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"snap_token" text,
	CONSTRAINT "orders_total_nonneg" CHECK ("orders"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"order_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"estimate" integer DEFAULT 10 NOT NULL,
	"egg_price" integer DEFAULT 4000 NOT NULL,
	"recipient_shift_id" text,
	"wa_connected" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_singleton" CHECK ("store_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_token_uq" ON "orders" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_uq" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_idx" ON "orders" USING btree ("fulfillment_status");