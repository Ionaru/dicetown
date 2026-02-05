import { getUserNameFromId } from "../auth/username";
import { Q_deletePlayerById } from "../db/queries/players";

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
