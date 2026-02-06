import { component$ } from "@qwik.dev/core";

import { EstablishmentId, ESTABLISHMENTS } from "../../game/constants";

interface GamePlayerEstablishmentsProps {
  establishments: Partial<Record<EstablishmentId, number>>;
  establishmentsInPlay: (typeof ESTABLISHMENTS)[keyof typeof ESTABLISHMENTS][];
}

export default component$<GamePlayerEstablishmentsProps>(
  ({ establishments, establishmentsInPlay }) => {
    const buildEstablishmentGrid = () => {
      const grid = [];
      for (const element of establishmentsInPlay) {
        const owned = establishments[element.id] ?? 0;
        let cardColor = "";
        switch (element.color) {
          case "blue":
            cardColor = "bg-mk-card-blue";
            break;
          case "green":
            cardColor = "bg-mk-card-green";
            break;
          case "red":
            cardColor = "bg-mk-card-red";
            break;
          case "purple":
            cardColor = "bg-mk-card-purple";
            break;
          default:
            cardColor = "bg-mk-card-blue";
            break;
        }
        grid.push(
          <div
            key={element.id}
            class={`relative m-1 h-4 w-3 rounded-xs shadow-sm ${cardColor} ${owned > 0 ? "" : "opacity-30"}`}
            title={element.name}
          >
            <span class="font-honey absolute top-0 right-0 left-0 mx-auto w-max text-center text-xs leading-0">
              {element.activation.join("-")}
            </span>
          </div>,
        );
      }
      return grid;
    };

    return <div class="grid grid-cols-5">{buildEstablishmentGrid()}</div>;
  },
);
