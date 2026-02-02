import { RequestEventBase } from "@qwik.dev/router";

import { Q_getAnonymousUserById } from "../db/queries/anonymous-users";
import { Q_getUserById } from "../db/queries/users";
import { anonymousUsers, users } from "../db/schema";

import { getSessionContext } from "./session";

export const getUserName = async (
  requestEvent: RequestEventBase,
): Promise<{ name: string; sessionId: string }> => {
  const { session } = await getSessionContext(requestEvent);
  if (session.userId) {
    const user = await Q_getUserById.execute({ id: session.userId });
    if (user) {
      return { name: user.displayName ?? "Unknown", sessionId: session.id };
    }
  }

  const anonymousUser = await Q_getAnonymousUserById.execute({
    id: session.anonymousUserId,
  });
  return {
    name: anonymousUser?.name ?? "Unknown",
    sessionId: session.id,
  };
};

export const getUserNameFromId = async (id: string): Promise<string> => {
  const user = await Q_getUserById.execute({ id });
  if (user) {
    return user.displayName ?? "Unknown user";
  }

  const anonymousUser = await Q_getAnonymousUserById.execute({ id });
  return anonymousUser?.name ?? "Unknown user";
};

export const getUserFromId = async (
  id: string,
): Promise<
  typeof users.$inferSelect | typeof anonymousUsers.$inferSelect | undefined
> => {
  const user = await Q_getUserById.execute({ id });
  if (user) {
    return user;
  }

  const anonymousUser = await Q_getAnonymousUserById.execute({ id });
  return anonymousUser;
};
