import { eq } from "drizzle-orm/pg-core/expressions";

import { getUserNameFromId } from "../auth/username";
import { db } from "../db/db";
import { Q_deletePlayerById } from "../db/queries/players";
import { players, rooms } from "../db/schema";

const getAiPlayerName = (turnOrder: number) => {
  let name = "Alpha";
  switch (turnOrder) {
    case 2:
      name = "Beta";
      break;
    case 3:
      name = "Gamma";
      break;
    case 4:
      name = "Delta";
      break;
    case 5:
      name = "Epsilon";
      break;
  }
  return `AI ${name}`;
}

export const getPlayerUsername = async (player: { userId: string | null; anonymousUserId: string | null; isAi: boolean, turnOrder: number }) => {
if (player.isAi) {
  return getAiPlayerName(player.turnOrder);
}

const id = player.userId ?? player.anonymousUserId;
if (!id) {
  return "Unknown player";
}

return getUserNameFromId(id);
};

export const leaveRoom = async (playerId: string) => {
  await Q_deletePlayerById.execute({ id: playerId });
};

export const migrateHostIfNeeded = async (room: typeof rooms.$inferSelect, roomPlayers: typeof players.$inferSelect[]) => {
  const validIds = roomPlayers.map((p) => p.userId ?? p.anonymousUserId);
  if (!validIds.includes(room.hostId)) {
    const firstPlayer = validIds.at(0);
    if (firstPlayer) {
      await db
        .update(rooms)
        .set({ hostId: firstPlayer })
        .where(eq(rooms.id, room.id));
    }
  }
}
