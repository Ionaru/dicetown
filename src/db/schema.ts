import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { RoomStatus, TurnPhase } from "../utils/enums";

export const roomStatusEnum = pgEnum("room_status", [
  RoomStatus.Waiting,
  RoomStatus.Playing,
  RoomStatus.Finished,
]);

export const turnPhaseEnum = pgEnum("turn_phase", [
  TurnPhase.Rolling,
  TurnPhase.Income,
  TurnPhase.Buying,
  TurnPhase.Cleanup,
]);

export const anonymousUsers = pgTable(
  "anonymous_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(), // Not unique, there's only so many animal names.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
).enableRLS();

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
).enableRLS();

export const webauthnCredentials = pgTable(
  "webauthn_credentials",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: text("transports").array(),
    // deviceType: text("device_type").notNull(),
    backupEligible: boolean("backup_eligible").notNull().default(false),
    backupState: boolean("backup_state").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("webauthn_credential_id_unique").on(table.credentialId),
    index("webauthn_user_id_idx").on(table.userId),
  ],
).enableRLS();

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hostId: uuid("host_id").notNull(),
    code: text("code").notNull(),
    status: roomStatusEnum("status").notNull().default(RoomStatus.Waiting),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rooms_code_unique").on(table.code),
    index("rooms_status_idx").on(table.status),
  ],
).enableRLS();

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    isAi: boolean("is_ai").notNull().default(false),
    coins: integer("coins").notNull().default(0),
    cards: jsonb("cards")
      .notNull()
      .default(sql`'{}'::jsonb`),
    landmarks: jsonb("landmarks")
      .notNull()
      .default(sql`'{}'::jsonb`),
    turnOrder: integer("turn_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("players_room_id_idx").on(table.roomId),
    index("players_user_id_idx").on(table.userId),
    uniqueIndex("players_room_turn_order_unique").on(
      table.roomId,
      table.turnOrder,
    ),
  ],
).enableRLS();

export const gameState = pgTable(
  "game_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .references(() => rooms.id, { onDelete: "set null" }),
    currentTurnPlayerId: uuid("current_turn_player_id").references(
      () => players.id,
      { onDelete: "set null" },
    ),
    phase: turnPhaseEnum("phase").notNull().default(TurnPhase.Rolling),
    lastDiceRoll: integer("last_dice_roll").array(),
    marketState: jsonb("market_state")
      .notNull()
      .default(sql`'{}'::jsonb`),
    pendingDecisions: jsonb("pending_decisions")
      .notNull()
      .default(sql`'[]'::jsonb`),
    hasPurchased: boolean("has_purchased").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("game_state_phase_idx").on(table.phase),
    index("game_state_room_id_idx").on(table.roomId),
  ],
).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(webauthnCredentials),
  players: many(players),
}));

export const webauthnCredentialsRelations = relations(
  webauthnCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [webauthnCredentials.userId],
      references: [users.id],
    }),
  }),
);

export const roomsRelations = relations(rooms, ({ many, one }) => ({
  players: many(players),
  gameState: one(gameState, {
    fields: [rooms.id],
    references: [gameState.roomId],
  }),
}));

export const playersRelations = relations(players, ({ one }) => ({
  room: one(rooms, {
    fields: [players.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
}));

export const gameStateRelations = relations(gameState, ({ one }) => ({
  room: one(rooms, {
    fields: [gameState.roomId],
    references: [rooms.id],
  }),
  currentTurnPlayer: one(players, {
    fields: [gameState.currentTurnPlayerId],
    references: [players.id],
  }),
}));
