import { RequestEventBase } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db/db";
import { anonymousUsers, users } from "../db/schema";

import { getSessionContext } from "./session";

export const getUserName = async (
  requestEvent: RequestEventBase,
): Promise<{ name: string; sessionId: string }> => {
  const { session } = await getSessionContext(requestEvent);
  if (session.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (user) {
      return { name: user.displayName ?? "Unknown", sessionId: session.id };
    }
  }

  const anonymousUser = await db.query.anonymousUsers.findFirst({
    where: eq(anonymousUsers.id, session.anonymousUserId),
  });
  return {
    name: anonymousUser?.name ?? "Unknown",
    sessionId: session.id,
  };
};

export const getUserNameFromId = async (
  id: string,
): Promise<{ name: string; sessionId: string }> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (user) {
    return { name: user.displayName ?? "Unknown", sessionId: id };
  }
  const anonymousUser = await db.query.anonymousUsers.findFirst({
    where: eq(anonymousUsers.id, id),
  });
  return { name: anonymousUser?.name ?? "Unknown", sessionId: id };
};
