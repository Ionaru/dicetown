import { asc, sql } from "drizzle-orm";
import { eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db";
import { players, rooms } from "../schema";
import { registerPreparedQuery } from "../utils";

export const findRoomFromCodeWithPlayers = registerPreparedQuery<{
  code: string;
}>()(
  db.query.rooms
    .findFirst({
      where: eq(rooms.code, sql.placeholder("code")),
      with: {
        players: {
          orderBy: [asc(players.turnOrder)],
        },
      },
    })
    .prepare("findRoomFromCodeWithPlayers"),
);
