import { RequestEventLoader } from "@builder.io/qwik-city";

import { Q_findPlayerWithRoomById } from "../../db/queries/players";

import { useSession } from "./layout";

export const navigateToRoom = async (requestEvent: RequestEventLoader) => {
  const { session } = await requestEvent.resolveValue(useSession);
  try {
    const player = await Q_findPlayerWithRoomById.execute({
      id: session.userId ?? session.anonymousUserId,
    });
    if (player?.room.code) {
      throw requestEvent.redirect(302, `/room/${player.room.code}`);
    }
  } catch (error) {
    console.error(error);
  }
};

export const navigateToGame = async (requestEvent: RequestEventLoader) => {
  const { session } = await requestEvent.resolveValue(useSession);
  const player = await Q_findPlayerWithRoomById.execute({
    id: session.userId ?? session.anonymousUserId,
  });
  if (player?.room.status === "playing") {
    throw requestEvent.redirect(302, `/game/${player.room.code}`);
  }
};
