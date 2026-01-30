import { players } from "../db/schema";
import { getUserNameFromId } from "../auth/username";

export const getPlayerUsername = async (player: typeof players.$inferSelect) => {
const id = player.userId ?? player.anonymousUserId;
if (!id) {
  return "Unknown player";
}

return getUserNameFromId(id);
};
