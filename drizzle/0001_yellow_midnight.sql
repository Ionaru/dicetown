ALTER TABLE "players" ADD COLUMN "anonymous_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_anonymous_user_id_anonymous_users_id_fk" FOREIGN KEY ("anonymous_user_id") REFERENCES "public"."anonymous_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "name";