import { component$, Slot } from "@qwik.dev/core";
import { routeLoader$ } from "@qwik.dev/router";

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
