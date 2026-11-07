CREATE TABLE "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"midtrans_order_id" text NOT NULL,
	"order_id" text,
	"source" text NOT NULL,
	"transaction_status" text,
	"fraud_status" text,
	"status_code" text,
	"gross_amount" text,
	"result" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"midtrans_order_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"gross_amount" integer NOT NULL,
	"snap_token" text,
	"redirect_url" text,
	"midtrans_transaction_id" text,
	"payment_type" text,
	"expires_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "needs_time_confirmation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_events_order_idx" ON "payment_events" USING btree ("midtrans_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_tx_midtrans_order_uq" ON "payment_transactions" USING btree ("midtrans_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_tx_order_attempt_uq" ON "payment_transactions" USING btree ("order_id","attempt");--> statement-breakpoint
CREATE INDEX "payment_tx_status_idx" ON "payment_transactions" USING btree ("status");