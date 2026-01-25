import DiceBox from "@3d-dice/dice-box-threejs";
import {
  component$,
  Slot,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createServerClient } from "supabase-auth-helpers-qwik";

import Footer from "../components/starter/footer/footer";
import { DiceBoxContext } from "../context/dice-box";

export const useServerTimeLoader = routeLoader$(() => {
  return {
    date: new Date().toISOString(),
  };
});

export const useDBTest = routeLoader$(async (requestEv) => {
  const supabaseClient = createServerClient(
    requestEv.env.get("PUBLIC_SUPABASE_URL")!,
    requestEv.env.get("PUBLIC_SUPABASE_ANON_KEY")!,
    requestEv,
  );
  const { data } = await supabaseClient.from("test").select("*");
  return { data };
});

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
  useContextProvider(DiceBoxContext, diceBox);

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

  return (
    <>
      <main>
        <Slot />
      </main>
      <div
        id="dice-box"
        class="fixed top-0 left-0 w-full h-full pointer-events-none"
      ></div>
      <Footer />
    </>
  );
});
