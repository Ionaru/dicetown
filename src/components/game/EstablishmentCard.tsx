import { $, component$ } from "@qwik.dev/core";
import { server$ } from "@qwik.dev/router";
import { ServerError } from "@qwik.dev/router/middleware/request-handler";

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
    throw new ServerError(400, "Player not found");
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
  canAfford: boolean;
}

export default component$<MarketCardProps>(({ card, count, canAfford }) => {
  const cardDefinition = ESTABLISHMENTS[card];
  if (!cardDefinition) {
    throw new Error(`Card definition not found for ${card}`);
  }

  let backgroundColor = "";
  switch (cardDefinition.color) {
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
  }

  let disabledReason: string | null = null;
  if (count <= 0) {
    disabledReason = "Sold out";
  } else if (canAfford === false) {
    disabledReason = "Not enough coins";
  }
  const isDisabled = disabledReason !== null;
  const disabledStyles = isDisabled ? "opacity-50 pointer-events-none" : "";
  const interactionStyles = isDisabled
    ? ""
    : "cursor-pointer hover:scale-105 hover:brightness-105";

  const buyEstablishmentAction = $(async () => {
    try {
      await buyEstablishmnent$(card);
    } catch (error) {
      console.error("Failed to buy establishment", typeof error);
      if (error instanceof ServerError) {
        console.error("Failed to buy establishment", error);
      }
    }
  });

  const baseStyles = `${backgroundColor} rounded-md p-2 text-white ${disabledStyles} ${interactionStyles} flex flex-col items-center justify-between transition-all duration-300`;

  return (
    <div
      class={baseStyles}
      onClick$={isDisabled ? undefined : buyEstablishmentAction}
      aria-disabled={isDisabled}
      title={disabledReason ?? undefined}
    >
      <span>🎲 {cardDefinition.activation.join(", ")}</span>
      <span>{cardDefinition.name}</span>
      <span>🪙 {cardDefinition.cost}</span>
      <span>x{count} available</span>
      {disabledReason && (
        <span class="rounded-md bg-black/30 px-2 py-1 text-center text-xs font-semibold">
          {disabledReason}
        </span>
      )}
    </div>
  );
});
