import { $, component$, QRL } from "@qwik.dev/core";

import type { PlayerState } from "../../../game/types";
import StandardButton from "../../common/StandardButton";

interface TvStationPickerProps {
  opponents: PlayerState[];
  playerNames: Map<string, string>;
  onPick$: QRL<(targetPlayerId: string) => void>;
}

export default component$<TvStationPickerProps>(
  ({ opponents, playerNames, onPick$ }) => {
    return (
      <div class="flex w-80 flex-col items-center gap-3">
        <h3 class="text-xl font-bold">TV Station</h3>
        <p class="text-sm">Choose a player to take 5 coins from:</p>
        <div class="flex w-full flex-col gap-2">
          {opponents.map((opponent) => (
            <StandardButton
              key={opponent.id}
              onClick$={$(() => onPick$(opponent.id))}
            >
              {playerNames.get(opponent.id) ?? "Unknown"} ({opponent.coins}{" "}
              coins)
            </StandardButton>
          ))}
        </div>
      </div>
    );
  },
);
