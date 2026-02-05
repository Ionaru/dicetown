import { component$ } from "@qwik.dev/core";

import { EstablishmentId } from "../../game/constants";

import MarketCard from "./MarketCard";

interface CardMarketProps {
  cards: Record<EstablishmentId, number>;
}

export default component$<CardMarketProps>(({ cards }) => {
  return (
    <div class="grid grid-cols-4 gap-4">
      {Object.entries(cards).map(([card, count]) => (
        <MarketCard key={card} card={card as EstablishmentId} count={count} />
      ))}
    </div>
  );
});
