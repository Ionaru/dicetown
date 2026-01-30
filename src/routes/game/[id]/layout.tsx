import { component$, Slot } from "@builder.io/qwik";

import DiceBox from "../../../components/game/DiceBox";
import Footer from "../../../components/starter/footer/PageFooter";

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
