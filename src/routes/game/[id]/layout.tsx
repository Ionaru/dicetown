import { component$, Slot } from "@qwik.dev/core";

import DiceBox from "../../../components/game/DiceBox";

export default component$(() => {
  return (
    <>
      <div class="m-8 flex rounded-xl bg-[url(/backdrop.avif)] bg-cover bg-center bg-no-repeat inset-shadow-sm/50">
        <main class="m-4 flex-1 rounded-xl bg-white/20 p-4 shadow-xl/30">
          <Slot />
        </main>
      </div>
      <DiceBox />
    </>
  );
});
