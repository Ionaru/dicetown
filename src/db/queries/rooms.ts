import { asc, sql, eq } from "drizzle-orm";

import { db } from "../db";
import { players, rooms } from "../schema";
import { registerPreparedQuery } from "../utils";

export const Q_findRoomFromCodeWithPlayers = registerPreparedQuery<{
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

export const Q_findRoomWithPlayersById = registerPreparedQuery<{
  id: string;
}>()(
  db.query.rooms
    .findFirst({
      where: eq(rooms.id, sql.placeholder("id")),
      with: {
        players: true,
      },
    })
    .prepare("Q_findRoomWithPlayersById"),
);
