import { component$, useComputed$ } from "@qwik.dev/core";
import type { Entries } from "type-fest";

import {
  EstablishmentId,
  ESTABLISHMENTS,
  LandmarkId,
  LANDMARKS,
} from "../../game/constants";

interface PlayerOwnedCardsProps {
  landmarks: Partial<Record<LandmarkId, boolean>>;
  establishments: Partial<Record<EstablishmentId, number>>;
}

const getLandmarkIcon = (landmarkId: LandmarkId): string => {
  switch (landmarkId) {
    case "train-station":
      return "🚂";
    case "shopping-mall":
      return "🛍️";
    case "amusement-park":
      return "🎠";
    case "radio-tower":
      return "📻";
  }
};

const getEstablishmentColorClass = (cardId: EstablishmentId): string => {
  switch (ESTABLISHMENTS[cardId].color) {
    case "blue":
      return "bg-mk-card-blue";
    case "green":
      return "bg-mk-card-green";
    case "red":
      return "bg-mk-card-red";
    case "purple":
      return "bg-mk-card-purple";
  }
};

export default component$<PlayerOwnedCardsProps>((props) => {
  const ownedLandmarks = useComputed$(() => {
    const landmarks = props.landmarks;
    return (Object.entries(LANDMARKS) as Entries<typeof LANDMARKS>)
      .filter(([landmarkId]) => landmarks[landmarkId] === true)
      .toSorted(([, a], [, b]) => a.cost - b.cost);
  });

  const ownedEstablishments = useComputed$(() => {
    const establishments = props.establishments;
    return (Object.entries(ESTABLISHMENTS) as Entries<typeof ESTABLISHMENTS>)
      .filter(([cardId]) => (establishments[cardId] ?? 0) > 0)
      .toSorted(
        ([a], [b]) =>
          (ESTABLISHMENTS[a].activation.at(0) ?? 0) -
          (ESTABLISHMENTS[b].activation.at(0) ?? 0),
      );
  });

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h3 class="text-3xl">Landmarks</h3>
        {ownedLandmarks.value.length === 0 ? (
          <p class="text-xl">No landmarks built yet.</p>
        ) : (
          <div class="grid grid-cols-4 gap-4">
            {ownedLandmarks.value.map(([landmarkId, landmark]) => (
              <div
                key={landmarkId}
                class="shadow-md bg-mk-card-yellow flex h-62 w-40 flex-col items-center justify-between rounded-md p-2 text-white"
              >
                <h4 class="text-center text-2xl">{landmark.name}</h4>
                <p class="text-center text-4xl">{getLandmarkIcon(landmarkId)}</p>
                <p class="text-center">{landmark.description}</p>
                <p class="text-center">🪙 {landmark.cost}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="flex flex-col gap-3">
        <h3 class="text-3xl">Establishments</h3>
        {ownedEstablishments.value.length === 0 ? (
          <p class="text-xl">No establishments owned yet.</p>
        ) : (
          <div class="grid grid-cols-5 gap-4">
            {ownedEstablishments.value.map(([cardId, establishment]) => (
              <div
                key={cardId}
                class={`${getEstablishmentColorClass(cardId)} rounded-md p-2 text-white flex flex-col items-center justify-between`}
              >
                <span>🎲 {establishment.activation.join(", ")}</span>
                <span>{establishment.name}</span>
                <span>🪙 {establishment.cost}</span>
                <span>x{props.establishments[cardId] ?? 0} owned</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
