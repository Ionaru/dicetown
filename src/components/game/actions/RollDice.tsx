import { $, component$, Signal } from "@qwik.dev/core";
import { server$ } from "@qwik.dev/router";

import { rollDiceForTurn } from "../../../server/game-service";
import BigButton from "../../common/BigButton";

interface RollDiceProps {
  code: string;
  playerId: string;
  canRoll2Dice: boolean;
  isRolling: Signal<boolean>;
}

const rollDice$ = server$((code, playerId, diceCount = 1) =>
  rollDiceForTurn({ code, playerId, diceCount }),
);

export default component$<RollDiceProps>(
  ({ code, playerId, canRoll2Dice, isRolling }) => {
    const rollDiceAction = $(() => {
      isRolling.value = true;
      rollDice$(code, playerId, 1);
    });

    const roll2DiceAction = $(() => {
      isRolling.value = true;
      rollDice$(code, playerId, 2);
    });

    return (
      <div class="flex w-64 items-center justify-center gap-4">
        <BigButton onClick$={rollDiceAction}>Roll Dice</BigButton>
        {canRoll2Dice && (
          <BigButton onClick$={roll2DiceAction}>Roll 2 Dice</BigButton>
        )}
      </div>
    );
  },
);
