import { RequestEventLoader } from "@qwik.dev/router";

import { Q_findPlayerWithRoomById } from "../../db/queries/players";

import { useSession } from "./layout";

export const navigateToRoom = async (requestEvent: RequestEventLoader) => {
  const { session } = await requestEvent.resolveValue(useSession);
  let code: string | undefined;
  try {
    const player = await Q_findPlayerWithRoomById.execute({
      id: session.userId ?? session.anonymousUserId,
    });
    code = player?.room.code;
  } catch (error) {
    console.error(error);
  }
  if (code) {
    throw requestEvent.redirect(302, `/room/${code}`);
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
