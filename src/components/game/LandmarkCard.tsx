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

  let icon = "🔳";
  switch (card) {
    case "train-station":
      icon = "🚂";
      break;
    case "shopping-mall":
      icon = "🛍️";
      break;
    case "amusement-park":
      icon = "🎠";
      break;
    case "radio-tower":
      icon = "📻";
      break;
  }

  const baseStyles = "shadow-md bg-mk-card-yellow flex h-62 w-40 cursor-pointer flex-col items-center justify-between rounded-md p-2 text-white transition-all duration-300 hover:scale-105 hover:brightness-105";
  const ownedStyles = owned ? "opacity-50 pointer-events-none" : "";

  return (
    <div
      class={`${baseStyles} ${ownedStyles}`}
      onClick$={() => buyLandmark$(card)}
    >
      <h1 class="text-2xl text-center">{cardDefinition.name}</h1>
      <p class="text-4xl text-center">{icon}</p>
      <p class="text-center">{cardDefinition.description}</p>
      <p class="text-center">🪙 {cardDefinition.cost}</p>
    </div>
  );
});
