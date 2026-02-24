import { $, component$ } from "@qwik.dev/core";
import { server$ } from "@qwik.dev/router";

import { endTurn } from "../../../server/game-service";
import BigButton from "../../common/BigButton";

const endTurn$ = server$((code, playerId) => endTurn({ code, playerId }));

interface EndTurnProps {
  code: string;
  playerId: string;
  isDoubles?: boolean;
}

export default component$<EndTurnProps>(({ code, playerId, isDoubles = false }) => {
  const endTurnAction = $(() => endTurn$(code, playerId));

  return (
    <div class="m-8 flex w-64 flex-col items-center justify-center gap-4">
      {isDoubles && (
        <p class="text-center text-lg font-bold">
          You rolled doubles! You get another turn.
        </p>
      )}
      <BigButton onClick$={endTurnAction}>
        {isDoubles ? "Take another turn" : "End turn"}
      </BigButton>
    </div>
  );
});
