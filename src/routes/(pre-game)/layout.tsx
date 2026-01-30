import { component$, Slot } from "@builder.io/qwik";
import { Link, routeLoader$ } from "@builder.io/qwik-city";

import { getUserName } from "../../auth/username";
import Footer from "../../components/starter/footer/PageFooter";

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

export const useAnonymousUserName = routeLoader$(
  async (requestEvent) => await getUserName(requestEvent),
);

export default component$(() => {
  const { name } = useAnonymousUserName().value;
  return (
    <>
      <main>
        <div class="absolute top-4 right-4 text-xl capitalize select-none">
          <Link href="/auth/">👤 {name}</Link>
        </div>
        <Slot />
      </main>
      <Footer />
    </>
  );
});
