import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { getUserName } from "../../auth/username";
import Footer from "../../components/core/PageFooter";

export const useAnonymousUserName = routeLoader$(
  async (requestEvent) => await getUserName(requestEvent),
);

export default component$(() => {
  return (
    <>
      <main>
        <Slot />
      </main>
      <Footer />
    </>
  );
});
