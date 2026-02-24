import { $, component$, QRL, useSignal } from "@qwik.dev/core";

import {
  ESTABLISHMENTS,
  type EstablishmentId,
} from "../../../game/constants";
import type { PlayerState } from "../../../game/types";
import StandardButton from "../../common/StandardButton";

interface BusinessCenterPickerProps {
  myCards: EstablishmentId[];
  opponents: { player: PlayerState; cards: EstablishmentId[] }[];
  playerNames: Map<string, string>;
  onPick$: QRL<
    (targetPlayerId: string, giveCardId: EstablishmentId, takeCardId: EstablishmentId) => void
  >;
}

export default component$<BusinessCenterPickerProps>(
  ({ myCards, opponents, playerNames, onPick$ }) => {
    const giveCardId = useSignal<EstablishmentId | null>(null);
    const targetPlayerId = useSignal<string | null>(null);

    const selectedOpponent = opponents.find(
      (o) => o.player.id === targetPlayerId.value,
    );

    return (
      <div class="flex w-96 flex-col items-center gap-3">
        <h3 class="text-xl font-bold">Business Center</h3>

        {!giveCardId.value && (
          <>
            <p class="text-sm">Choose one of your cards to give away:</p>
            <div class="grid w-full grid-cols-3 gap-2">
              {myCards.map((cardId) => {
                const est = ESTABLISHMENTS[cardId];
                return (
                  <button
                    key={cardId}
                    class="cursor-pointer rounded border p-2 text-sm hover:bg-white/20"
                    onClick$={$(() => {
                      giveCardId.value = cardId;
                    })}
                  >
                    {est.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {giveCardId.value && !targetPlayerId.value && (
          <>
            <p class="text-sm">
              Giving: <strong>{ESTABLISHMENTS[giveCardId.value].name}</strong>
            </p>
            <p class="text-sm">Choose an opponent:</p>
            <div class="flex w-full flex-col gap-2">
              {opponents
                .filter((o) => o.cards.length > 0)
                .map((o) => (
                  <StandardButton
                    key={o.player.id}
                    onClick$={$(() => {
                      targetPlayerId.value = o.player.id;
                    })}
                  >
                    {playerNames.get(o.player.id) ?? "Unknown"}
                  </StandardButton>
                ))}
            </div>
            <StandardButton
              variant="secondary"
              onClick$={$(() => {
                giveCardId.value = null;
              })}
            >
              Back
            </StandardButton>
          </>
        )}

        {giveCardId.value && selectedOpponent && (
          <>
            <p class="text-sm">
              Giving: <strong>{ESTABLISHMENTS[giveCardId.value].name}</strong>
              {" to "}
              {playerNames.get(selectedOpponent.player.id) ?? "Unknown"}
            </p>
            <p class="text-sm">Choose a card to take:</p>
            <div class="grid w-full grid-cols-3 gap-2">
              {selectedOpponent.cards.map((cardId) => {
                const est = ESTABLISHMENTS[cardId];
                return (
                  <button
                    key={cardId}
                    class="cursor-pointer rounded border p-2 text-sm hover:bg-white/20"
                    onClick$={$(() => {
                      onPick$(
                        selectedOpponent.player.id,
                        giveCardId.value!,
                        cardId,
                      );
                    })}
                  >
                    {est.name}
                  </button>
                );
              })}
            </div>
            <StandardButton
              variant="secondary"
              onClick$={$(() => {
                targetPlayerId.value = null;
              })}
            >
              Back
            </StandardButton>
          </>
        )}
      </div>
    );
  },
);
