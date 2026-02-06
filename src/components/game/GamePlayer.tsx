import { component$ } from "@qwik.dev/core";

import { EstablishmentId, ESTABLISHMENTS, LandmarkId } from "../../game/constants";

import GamePlayerEstablishments from "./GamePlayerEstablishments";

interface PlayerBoxProps {
  name: string;
  coins: number;
  isMe: boolean;
  isCurrentTurn: boolean;
  isAi: boolean;
  landmarks: Partial<Record<LandmarkId, boolean>>;
  establishments: Partial<Record<EstablishmentId, number>>;
  establishmentsInPlay: (typeof ESTABLISHMENTS[keyof typeof ESTABLISHMENTS])[];
}

export default component$<PlayerBoxProps>(
  ({ name, coins, isMe, isCurrentTurn, isAi, landmarks = {}, establishments = {}, establishmentsInPlay }) => {
    const isCurrentTurnStyle = isCurrentTurn
      ? "border-double border-x-4 border-t-4 border-white pb-4"
      : "m-1 mb-0";

    const isMeStyle = isMe ? "bg-mk-blue/75!" : "bg-black/50";
    const isAiStyle = isAi ? "font-mono text-base!" : "rounded-t-xl";

    return (
      <div
        class={`cursor-pointer transition-[padding] ease-in-out hover:pb-4 h-max flex flex-col items-center justify-center p-2 text-xl text-white select-none gap-2 ${isCurrentTurnStyle} ${isMeStyle} ${isAiStyle}`}
      >
        <span class="rounded-md h-6">{name}</span>
        <span class="rounded-md text-2xl font-honey">🪙 {coins}</span>
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
        <GamePlayerEstablishments establishments={establishments} establishmentsInPlay={establishmentsInPlay} />
      </div>
    );
  },
);
