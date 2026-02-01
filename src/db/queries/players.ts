import { sql } from "drizzle-orm";
import { and, or, eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db";
import {
  buildPlayerAnonymousUserIdIfNotNullCondition,
  buildPlayerUserIdIfNotNullCondition,
  playerAnonymousUserIdIfNotNull,
  playerUserIdIfNotNull,
} from "../parts";
import { players } from "../schema";
import { registerPreparedQuery } from "../utils";

export const findPlayerInRoom = registerPreparedQuery<{
  roomId: string;
  userId: string | null;
  anonymousUserId: string | null;
}>()(
  db.query.players
    .findFirst({
      where: and(
        eq(players.roomId, sql.placeholder("roomId")),
        or(playerUserIdIfNotNull, playerAnonymousUserIdIfNotNull),
      ),
    })
    .prepare("findPlayerInRoom"),
);

export const Q_insertPlayer = registerPreparedQuery<{
  roomId: string;
  userId: string | null;
  anonymousUserId: string | null;
  isAi: boolean;
  turnOrder: number;
}>()(
  db
    .insert(players)
    .values({
      roomId: sql.placeholder("roomId"),
      userId: sql.placeholder("userId"),
      anonymousUserId: sql.placeholder("anonymousUserId"),
      isAi: sql.placeholder("isAi"),
      coins: 0,
      cards: {},
      landmarks: {},
      turnOrder: sql.placeholder("turnOrder"),
    })
    .returning({
      id: players.id,
      turnOrder: players.turnOrder,
    })
    .prepare("Q_insertPlayer"),
);

export const Q_findPlayerWithRoomById = registerPreparedQuery<{
  id: string;
}>()(
  db.query.players
    .findFirst({
      where: or(
        buildPlayerUserIdIfNotNullCondition("id"),
        buildPlayerAnonymousUserIdIfNotNullCondition("id"),
      ),
      with: {
        room: true,
      },
    })
    .prepare("Q_findPlayerWithRoomById"),
);
