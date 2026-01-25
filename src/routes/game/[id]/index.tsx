import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

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
  const { id } = useGame().value;
  return (
    <div>
      <h1>Game {id}</h1>
    </div>
  );
});
