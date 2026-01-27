import { RequestEventBase } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";
import { animals, uniqueNamesGenerator } from "unique-names-generator";

import { db } from "../db/db";
import { anonymousUsers, users } from "../db/schema";

const getSessionId = (requestEvent: RequestEventBase) => {
    const existingCookie = requestEvent.cookie.get("sessionId");
    if (existingCookie) {
      return existingCookie.value;
    }
    const sessionId = crypto.randomUUID();
    requestEvent.cookie.set("sessionId", sessionId, {
      httpOnly: true,
      sameSite: "strict",
    });
    return sessionId;
  };

export const getUserName = async (requestEvent: RequestEventBase): Promise<{ name: string; sessionId: string }> => {
    const sessionId = getSessionId(requestEvent);
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionId),
    });
    if (user) {
      return { name: user.displayName ?? "Unknown", sessionId };
    }
    const anonymousUser = await db.query.anonymousUsers.findFirst({
      where: eq(anonymousUsers.id, sessionId),
    });
    if (anonymousUser) {
      return { name: anonymousUser.name, sessionId };
    }
    const name = `Anonymous ${uniqueNamesGenerator({ dictionaries: [animals] })}`;
    await db.insert(anonymousUsers).values({ id: sessionId, name });
    return { name, sessionId };
};

export const getUserNameFromId = async (id: string): Promise<{ name: string; sessionId: string }> => {
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