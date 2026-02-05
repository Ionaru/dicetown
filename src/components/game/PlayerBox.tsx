import { component$ } from "@qwik.dev/core";

import { LandmarkId } from "../../game/constants";

interface PlayerBoxProps {
  name: string;
  coins: number;
  isMe: boolean;
  isCurrentTurn: boolean;
  isAi: boolean;
  landmarks: Partial<Record<LandmarkId, boolean>>;
}

export default component$<PlayerBoxProps>(
  ({ name, coins, isMe, isCurrentTurn, isAi, landmarks = {} }) => {
    const isCurrentTurnStyle = isCurrentTurn
      ? "border-double border-4 border-white"
      : "m-1";

    const isMeStyle = isMe ? "bg-mk-card-green!" : "bg-mk-blue";
    const isAiStyle = isAi ? "font-mono text-base!" : "rounded-xl bg-mk-card-yellow";

    return (
      <div
        class={`flex flex-col items-center justify-center p-2 text-xl text-white select-none ${isCurrentTurnStyle} ${isMeStyle} ${isAiStyle}`}
      >
        <span class="rounded-md p-2">{name}</span>
        <span class="text-xl">
          <span title="Train Station">
            {landmarks["train-station"] ? "🚂" : "🔳"}
          </span>
          <span title="Shopping Mall">
            {landmarks["shopping-mall"] ? "🛍️" : "🔳"}
          </span>
          <span title="Amusement Park">
            {landmarks["amusement-park"] ? "🎠" : "🔳"}
          </span>
          <span title="Radio Tower">
            {landmarks["radio-tower"] ? "📻" : "🔳"}
          </span>
        </span>
        <span class="rounded-md p-2 text-2xl">🪙 {coins}</span>
      </div>
    );
  },
);
