import {
  component$,
  Slot,
} from "@builder.io/qwik";

import Footer from "../components/starter/footer/footer";

// export const useServerTimeLoader = routeLoader$(() => {
//   return {
//     date: new Date().toISOString(),
//   };
// });

// export const useDBTest = routeLoader$(async (requestEv) => {
//   const supabaseClient = createServerClient(
//     requestEv.env.get("PUBLIC_SUPABASE_URL")!,
//     requestEv.env.get("PUBLIC_SUPABASE_ANON_KEY")!,
//     requestEv,
//   );
//   const { data } = await supabaseClient.from("test").select("*");
//   return { data };
// });

export default component$(() => {
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
