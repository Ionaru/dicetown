import { getUserNameFromId } from "../auth/username";
import { Q_deletePlayerById } from "../db/queries/players";

export const getPlayerUsername = async (player: { userId: string | null; anonymousUserId: string | null; isAi: boolean, turnOrder: number }) => {
if (player.isAi) {
  return `AI player ${player.turnOrder}`;
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
