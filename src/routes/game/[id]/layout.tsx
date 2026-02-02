import { component$, Slot } from "@qwik.dev/core";

import Footer from "../../../components/core/PageFooter";
import DiceBox from "../../../components/game/DiceBox";

export default component$(() => {
  return (
    <>
      <DiceBox />
      <main>
        <Slot />
      </main>
      <Footer />
    </>
  );
});
