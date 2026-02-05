import { component$ } from "@qwik.dev/core";

import { RoomSnapshot } from "../../server/game-service";

import PlayerBox from "./PlayerBox";

interface GamePlayersProps {
  players: RoomSnapshot["players"];
  playerNames: Map<string, string>;
  meId: string;
  currId: string;
}

export default component$<GamePlayersProps>(
  ({ players, playerNames, meId, currId }) => {
    let gridCols = "";
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
      default:
        gridCols = "grid-cols-1";
        break;
    }

    return (
      <div class={`grid justify-center gap-4 ${gridCols} mx-auto w-max`}>
        {players.map((player) => (
          <PlayerBox
            key={player.id}
            name={playerNames.get(player.id) ?? "Unknown player"}
            coins={player.coins}
            isMe={player.id === meId}
            isCurrentTurn={player.id === currId}
            isAi={player.isAi}
            landmarks={player.landmarks ?? {}}
          />
        ))}
      </div>
    );
  },
);
