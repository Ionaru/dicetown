import { component$, useComputed$ } from "@qwik.dev/core";
import type { Entries } from "type-fest";

import { EstablishmentId, ESTABLISHMENTS } from "../../game/constants";

import EstablishmentCard from "./EstablishmentCard";

interface CardMarketProps {
  cards: Record<EstablishmentId, number>;
}

export default component$<CardMarketProps>(({ cards }) => {
  const marketCards = useComputed$(() =>
    (Object.entries(cards) as Entries<typeof cards>).toSorted(([a], [b]) => {
      return (
        (ESTABLISHMENTS[a].activation.at(0) ?? 0) -
        (ESTABLISHMENTS[b].activation.at(0) ?? 0)
      );
    }),
  );

  return (
    <div class="grid grid-cols-5 gap-4">
      {marketCards.value.map(([card, count]) => (
        <EstablishmentCard key={card} card={card} count={count} />
      ))}
    </div>
  );
});
