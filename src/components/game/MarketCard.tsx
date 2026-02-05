import { component$ } from "@qwik.dev/core";
import { server$ } from "@qwik.dev/router";

import { getSessionContext } from "../../auth/session";
import { Q_findPlayerWithRoomById } from "../../db/queries/players";
import { EstablishmentId, ESTABLISHMENTS } from "../../game/constants";
import { buyEstablishmentForTurn } from "../../server/game-service";

const buyEstablishmnent$ = server$(async function (card: EstablishmentId) {
  const { session } = await getSessionContext(this);
  const player = await Q_findPlayerWithRoomById.execute({
    id: session.userId ?? session.anonymousUserId,
  });
  if (!player) {
    throw new Error("Player not found");
  }
  return await buyEstablishmentForTurn({
    code: player.room.code,
    playerId: player.id,
    establishmentId: card,
  });
});

interface MarketCardProps {
  card: EstablishmentId;
  count: number;
}

export default component$<MarketCardProps>(({ card, count }) => {
  let backgroundColor = "";
  switch (ESTABLISHMENTS[card].color) {
    case "blue":
      backgroundColor = "bg-mk-card-blue";
      break;
    case "green":
      backgroundColor = "bg-mk-card-green";
      break;
    case "red":
      backgroundColor = "bg-mk-card-red";
      break;
    case "purple":
      backgroundColor = "bg-mk-card-purple";
      break;
    default:
      backgroundColor = "bg-mk-card-blue";
      break;
  }

  return (
    <div class={`${backgroundColor} rounded-md p-2 text-white`}>
      {ESTABLISHMENTS[card].name} - {count}
      <button class="cursor-pointer" onClick$={() => buyEstablishmnent$(card)}>
        Buy
      </button>
    </div>
  );
});
