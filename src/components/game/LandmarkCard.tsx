import { component$ } from "@qwik.dev/core";
import { server$ } from "@qwik.dev/router";

import { getSessionContext } from "../../auth/session";
import { Q_findPlayerWithRoomById } from "../../db/queries/players";
import { LandmarkId, LANDMARKS } from "../../game/constants";
import { buyLandmarkForTurn } from "../../server/game-service";

const buyLandmark$ = server$(async function (card: LandmarkId) {
  const { session } = await getSessionContext(this);
  const player = await Q_findPlayerWithRoomById.execute({
    id: session.userId ?? session.anonymousUserId,
  });
  if (!player) {
    throw new Error("Player not found");
  }
  return await buyLandmarkForTurn({
    code: player.room.code,
    playerId: player.id,
    landmarkId: card,
  });
});

interface LandmarkCardProps {
  card: LandmarkId;
  owned: boolean;
}

export default component$<LandmarkCardProps>(({ card, owned }) => {
  const cardDefinition = LANDMARKS[card];
  if (!cardDefinition) {
    throw new Error(`Card definition not found for ${card}`);
  }
  return (
    <div
      class={`${owned ? "bg-mk-card-green" : "bg-mk-card-red"} rounded-md p-2 text-white`}
    >
      <h1>{cardDefinition.name}</h1>
      <p>{cardDefinition.description}</p>
      <p>Cost: {cardDefinition.cost}</p>
      <button class="cursor-pointer" onClick$={() => buyLandmark$(card)}>
        Buy
      </button>
    </div>
  );
});
