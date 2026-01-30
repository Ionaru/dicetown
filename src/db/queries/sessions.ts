import { eq, sql } from "drizzle-orm";

import { db } from "../db";
import { sessions } from "../schema";
import { registerPreparedQuery } from "../utils";

type SessionRecord = typeof sessions.$inferSelect;
type SessionData = SessionRecord["data"];

export const Q_createSession = registerPreparedQuery<{
  anonymousUserId: string;
  userId?: string | null;
  data?: SessionData;
  now: Date;
  expiresAt: Date;
}>()(
  db
    .insert(sessions)
    .values({
      anonymousUserId: sql.placeholder("anonymousUserId"),
      userId: sql.placeholder("userId"),
      data: sql.placeholder("data"),
      lastSeenAt: sql.placeholder("now"),
      expiresAt: sql.placeholder("expiresAt"),
      createdAt: sql.placeholder("now"),
      updatedAt: sql.placeholder("now"),
    })
    .returning()
    .prepare("Q_createSession"),
);

export const Q_getSessionFromId = registerPreparedQuery<{
  id: string;
}>()(
  db.query.sessions
    .findFirst({
      where: eq(sessions.id, sql.placeholder("id")),
    })
    .prepare("Q_getSessionFromId"),
);

export const Q_updateSession = registerPreparedQuery<{
  id: string;
  now: Date;
  expiresAt: Date;
}>()(
  db
    .update(sessions)
    .set({
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      lastSeenAt: sql.placeholder("now"),
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      expiresAt: sql.placeholder("expiresAt"),
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      updatedAt: sql.placeholder("now"),
    })
    .where(eq(sessions.id, sql.placeholder("id")))
    .returning()
    .prepare("Q_updateSession"),
);

export const Q_expireSession = registerPreparedQuery<{
  id: string;
  now: Date;
}>()(
  db
    .update(sessions)
    .set({
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      expiresAt: sql.placeholder("now"),
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      updatedAt: sql.placeholder("now"),
    })
    .where(eq(sessions.id, sql.placeholder("id")))
    .returning()
    .prepare("Q_expireSession"),
);

export const Q_setSessionData = registerPreparedQuery<{
  id: string;
  data: SessionData;
  updatedAt: Date;
}>()(
  db
    .update(sessions)
    .set({
      data: sql.placeholder("data"),
      // @ts-expect-error - https://github.com/drizzle-team/drizzle-orm/pull/1666
      updatedAt: sql.placeholder("updatedAt"),
    })
    .where(eq(sessions.id, sql.placeholder("id")))
    .returning()
    .prepare("Q_setSessionData"),
);
