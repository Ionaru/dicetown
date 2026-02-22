import { $, component$ } from "@qwik.dev/core";
import BigButton from "../../common/BigButton";
import { server$ } from "@qwik.dev/router";
import { endTurn } from "../../../server/game-service";

const endTurn$ = server$((code, playerId) => endTurn({ code, playerId }));

interface EndTurnProps {
  code: string;
  playerId: string;
}

export default component$<EndTurnProps>(({ code, playerId }) => {
  const endTurnAction = $(() => endTurn$(code, playerId));

  return (
    <div class="m-8 flex flex-col items-center justify-center gap-4 w-64">
    <BigButton onClick$={endTurnAction}>
      End turn
    </BigButton>
  </div>
  );
});
