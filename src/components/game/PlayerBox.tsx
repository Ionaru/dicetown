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

    return (
      <div
        class={`bg-mk-blue flex flex-col items-center justify-center rounded-md p-2 text-white ${isCurrentTurnStyle}`}
      >
        <span class="rounded-md p-2">{name}</span>
        {isMe && <span class="rounded-md p-2">(You)</span>}
        {isAi && <span class="rounded-md p-2">🤖</span>}
        <span class="select-none">
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
        <span class="rounded-md p-2">🪙 {coins}</span>
      </div>
    );
  },
);
