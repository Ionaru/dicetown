import { sql } from "drizzle-orm";
import { and, or, eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db";
import {
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
