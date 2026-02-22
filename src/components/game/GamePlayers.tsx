import { $, component$, useComputed$, useSignal } from "@qwik.dev/core";

import { ESTABLISHMENTS } from "../../game/constants";
import { RoomSnapshot } from "../../server/game-service";
import StandardButton from "../common/StandardButton";

import GamePlayer from "./GamePlayer";
import PlayerOwnedCards from "./PlayerOwnedCards";

interface GamePlayersProps {
  players: RoomSnapshot["players"];
  playerNames: Map<string, string>;
  meId: string;
  currId: string;
  establishmentsInPlay: (typeof ESTABLISHMENTS)[keyof typeof ESTABLISHMENTS][];
}

export default component$<GamePlayersProps>(
  ({ players, playerNames, meId, currId, establishmentsInPlay }) => {
    const playerCardsDialogRef = useSignal<HTMLDialogElement>();
    const selectedPlayerId = useSignal<string | null>(null);

    const openPlayerCardsDialog = $((playerId: string) => {
      selectedPlayerId.value = playerId;
      playerCardsDialogRef.value?.showModal();
    });

    const closePlayerCardsDialog = $(() => {
      playerCardsDialogRef.value?.close();
    });

    const selectedPlayer = useComputed$(() => {
      return players.find((player) => player.id === selectedPlayerId.value) ?? null;
    });

    const selectedPlayerName = useComputed$(() => {
      return playerNames.get(selectedPlayer.value?.id ?? "") ?? "Unknown player";
    });

    let gridCols = "grid-cols-1";
    switch (players.length) {
      case 2:
        gridCols = "grid-cols-2";
        break;
      case 3:
        gridCols = "grid-cols-3";
        break;
      case 4:
        gridCols = "grid-cols-4";
        break;
      case 5:
        gridCols = "grid-cols-5";
        break;
    }

    return (
      <>
        <div
          class={`grid gap-4 ${gridCols} fixed right-0 bottom-0 left-0 mx-auto w-max items-end`}
        >
          {players.map((player) => (
            <GamePlayer
              key={player.id}
              name={playerNames.get(player.id) ?? "Unknown player"}
              coins={player.coins}
              isMe={player.id === meId}
              isCurrentTurn={player.id === currId}
              isAi={player.isAi}
              landmarks={player.landmarks ?? {}}
              establishments={player.cards ?? {}}
              establishmentsInPlay={establishmentsInPlay}
              onClick$={() => openPlayerCardsDialog(player.id)}
            />
          ))}
        </div>

        <dialog
          ref={playerCardsDialogRef}
          class="select-none fixed inset-0 m-auto max-h-[88vh] w-[min(95vw,84rem)] overflow-y-auto rounded-md border-0 bg-mk-card-sky p-8 shadow-md backdrop:bg-black/40"
        >
          {selectedPlayer.value && (
            <>
              <h2 class="text-4xl">{selectedPlayerName}'s cards</h2>
              <div class="mt-4">
                <PlayerOwnedCards
                  landmarks={selectedPlayer.value.landmarks ?? {}}
                  establishments={selectedPlayer.value.cards ?? {}}
                />
              </div>
            </>
          )}
          {!selectedPlayer && (
            <p class="text-xl">Could not load this player's cards.</p>
          )}
          <div class="mt-6 flex justify-end">
            <StandardButton class="w-auto px-8" onClick$={closePlayerCardsDialog}>
              Close
            </StandardButton>
          </div>
        </dialog>
      </>
    );
  },
);
