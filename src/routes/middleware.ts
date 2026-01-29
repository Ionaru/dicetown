import type { RequestHandler } from "@builder.io/qwik-city";

import { getSessionContext } from "../auth/session";

export const onRequest: RequestHandler = async (event) => {
  await getSessionContext(event);
  await event.next();
};
