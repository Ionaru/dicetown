import { component$ } from "@qwik.dev/core";

import {
  EstablishmentId,
  ESTABLISHMENTS,
  LandmarkId,
} from "../../game/constants";

import GamePlayerEstablishments from "./GamePlayerEstablishments";

interface PlayerBoxProps {
  name: string;
  coins: number;
  isMe: boolean;
  isCurrentTurn: boolean;
  isAi: boolean;
  landmarks: Partial<Record<LandmarkId, boolean>>;
  establishments: Partial<Record<EstablishmentId, number>>;
  establishmentsInPlay: (typeof ESTABLISHMENTS)[keyof typeof ESTABLISHMENTS][];
}

export default component$<PlayerBoxProps>(
  ({
    name,
    coins,
    isMe,
    isCurrentTurn,
    isAi,
    landmarks = {},
    establishments = {},
    establishmentsInPlay,
  }) => {
    const isCurrentTurnStyle = isCurrentTurn
      ? "border-double border-x-4 border-t-4 border-white pb-4"
      : "m-1 mb-0";

    const isMeStyle = isMe ? "bg-mk-blue!" : "bg-gray-500";
    const isAiStyle = isAi ? "font-mono text-base!" : "rounded-t-xl";

    return (
      <div
        class={`flex h-max cursor-pointer flex-col items-center justify-center gap-2 p-2 text-xl text-white transition-[padding] ease-in-out select-none hover:pb-4 ${isCurrentTurnStyle} ${isMeStyle} ${isAiStyle}`}
      >
        <span class="h-6 rounded-md">{name}</span>
        <span class="font-honey rounded-md text-2xl">🪙 {coins}</span>
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
        <GamePlayerEstablishments
          establishments={establishments}
          establishmentsInPlay={establishmentsInPlay}
        />
      </div>
    );
  },
);
