import { component$, Slot, useComputed$ } from "@qwik.dev/core";
import { Link, routeLoader$ } from "@qwik.dev/router";

import { getSessionContext } from "../../auth/session";
import { getUserFromId, getUserName } from "../../auth/username";
import Footer from "../../components/core/PageFooter";

export const useAnonymousUserName = routeLoader$(
  async (requestEvent) => await getUserName(requestEvent),
);

export const useSession = routeLoader$(
  async (requestEvent) => await getSessionContext(requestEvent),
);

export const useUser = routeLoader$(async (requestEvent) => {
  const { session } = await requestEvent.resolveValue(useSession);
  return await getUserFromId(session.userId ?? session.anonymousUserId);
});

export default component$(() => {
  const user = useUser().value;
  const name = useComputed$(() => {
    if (!user) return "Unknown";
    if ("displayName" in user) return user.displayName;
    return user.name ?? "Unknown";
  });
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
