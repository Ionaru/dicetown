import DiceBox from "@3d-dice/dice-box-threejs";
import { component$, useContextProvider, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { DiceBoxContext } from "../../../context/dice-box";
import { getRoomSnapshot } from "../../../server/game-service";

export const useGame = routeLoader$(async ({ params }) => {
  console.log(params);
  const snapshot = await getRoomSnapshot(params.id);
  console.log("snapshot", snapshot);
  return {
    id: params.id,
  };
});

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
  useContextProvider(DiceBoxContext, diceBox);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const box = new DiceBox("#dice-box", {
      sounds: true,
      assetPath: "/dice-box/",
      sound_dieMaterial: "plastic",
      theme_material: "plastic",
    });
    await box.initialize();
    console.debug("diceBox initialized");
    diceBox.value = box;
  });

  const { id } = useGame().value;
  return (
    <div>
      <h1>Game {id}</h1>
    </div>
  );
});
