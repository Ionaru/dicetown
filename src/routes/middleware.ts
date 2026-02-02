import type { RequestHandler } from "@qwik.dev/router";

import { getSessionContext } from "../auth/session";

export const onRequest: RequestHandler = async (event) => {
  await getSessionContext(event);
  await event.next();
};
