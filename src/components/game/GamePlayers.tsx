import { component$ } from "@qwik.dev/core";

import { ESTABLISHMENTS } from "../../game/constants";
import { RoomSnapshot } from "../../server/game-service";

import GamePlayer from "./GamePlayer";

interface GamePlayersProps {
  players: RoomSnapshot["players"];
  playerNames: Map<string, string>;
  meId: string;
  currId: string;
  establishmentsInPlay: (typeof ESTABLISHMENTS)[keyof typeof ESTABLISHMENTS][];
}

export default component$<GamePlayersProps>(
  ({ players, playerNames, meId, currId, establishmentsInPlay }) => {
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
          />
        ))}
      </div>
    );
  },
);
