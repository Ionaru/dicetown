import { component$ } from "@qwik.dev/core";
import { Entries } from "type-fest";

import { LandmarkId, LANDMARKS } from "../../game/constants";

import LandmarkCard from "./LandmarkCard";

interface CardMarketProps {
  cards: Partial<Record<LandmarkId, boolean>>;
}

export default component$<CardMarketProps>(({ cards }) => {
  const landmarkCards = (
    Object.entries(LANDMARKS) as Entries<typeof LANDMARKS>
  ).toSorted(([a], [b]) => {
    return LANDMARKS[a].cost - LANDMARKS[b].cost;
  });

  return (
    <div class="grid grid-cols-4 gap-4">
      {landmarkCards.map(([card]) => (
        <LandmarkCard key={card} card={card} owned={cards[card] ?? false} />
      ))}
    </div>
  );
});
