import type { RequestEventBase } from "@builder.io/qwik-city";
import { and, eq, gt } from "drizzle-orm/pg-core/expressions";
import { animals, uniqueNamesGenerator } from "unique-names-generator";

import { db } from "../db/db";
import { anonymousUsers, sessions } from "../db/schema";

import { sessionTtlSeconds } from "./config";

export const SESSION_CONTEXT_KEY = "auth.session";
export const SESSION_COOKIE_NAME = "sessionId";

const sessionTtlMs = sessionTtlSeconds * 1000;

const sessionCookieOptions = (event: RequestEventBase) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: event.url.protocol === "https:",
  maxAge: sessionTtlSeconds,
});

type SessionRecord = typeof sessions.$inferSelect;
type SessionData = SessionRecord["data"];

const isExpired = (session: SessionRecord, now: Date): boolean =>
  session.expiresAt.getTime() <= now.getTime();

const createAnonymousUser = async () => {
  const animalName = uniqueNamesGenerator({ dictionaries: [animals] });
  const name = `Anonymous ${animalName.charAt(0).toUpperCase() + animalName.slice(1)}`;
  const [anonymousUser] = await db
    .insert(anonymousUsers)
    .values({ name })
    .returning();
  return anonymousUser;
};

const createSession = async (input: {
  anonymousUserId: string;
  userId?: string | null;
  data?: SessionData;
}) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlMs);
  const [session] = await db
    .insert(sessions)
    .values({
      anonymousUserId: input.anonymousUserId,
      userId: input.userId ?? null,
      data: input.data ?? {},
      lastSeenAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return session;
};

const setSessionCookie = (event: RequestEventBase, sessionId: string) => {
  event.cookie.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(event));
};

const expireSession = async (sessionId: string) => {
  const now = new Date();
  await db
    .update(sessions)
    .set({ expiresAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId));
};

export type SessionContext = {
  session: SessionRecord;
  isNew: boolean;
};

export const getOrCreateSession = async (
  event: RequestEventBase,
): Promise<SessionContext> => {
  const now = new Date();
  const existingSessionId = event.cookie.get(SESSION_COOKIE_NAME)?.value;
  if (existingSessionId) {
    const session = await getSessionFromId(existingSessionId);
    if (session && !isExpired(session, now)) {
      const updated = await db
        .update(sessions)
        .set({
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + sessionTtlMs),
          updatedAt: now,
        })
        .where(eq(sessions.id, session.id))
        .returning();
      const refreshed = updated[0] ?? session;
      setSessionCookie(event, refreshed.id);
      return { session: refreshed, isNew: false };
    }
  }

  const anonymousUser = await createAnonymousUser();
  const session = await createSession({ anonymousUserId: anonymousUser.id });
  setSessionCookie(event, session.id);
  return { session, isNew: true };
};

export const getSessionContext = async (
  event: RequestEventBase,
): Promise<SessionContext> => {
  const cached = event.sharedMap.get(SESSION_CONTEXT_KEY) as
    | SessionContext
    | undefined;
  if (cached) {
    return cached;
  }
  const sessionContext = await getOrCreateSession(event);
  event.sharedMap.set(SESSION_CONTEXT_KEY, sessionContext);
  return sessionContext;
};

export const attachUserToSession = async (
  event: RequestEventBase,
  sessionId: string,
  userId: string,
): Promise<SessionRecord> => {
  const existing = await getSessionFromId(sessionId);
  const anonymousUserId =
    existing?.anonymousUserId ?? (await createAnonymousUser()).id;
  if (existing) {
    await expireSession(existing.id);
  }
  const session = await createSession({ anonymousUserId, userId });
  setSessionCookie(event, session.id);
  return session;
};

export const logoutToAnonymous = async (
  event: RequestEventBase,
  sessionId: string,
): Promise<SessionRecord> => {
  await expireSession(sessionId);
  const anonymousUser = await createAnonymousUser();
  const session = await createSession({
    anonymousUserId: anonymousUser.id,
  });
  setSessionCookie(event, session.id);
  return session;
};

export const setSessionData = async (sessionId: string, data: SessionData) => {
  const now = new Date();
  const [session] = await db
    .update(sessions)
    .set({ data, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .returning();
  return session ?? null;
};

export const mergeSessionData = async (
  sessionId: string,
  patch: Record<string, unknown>,
) => {
  const session = await getSessionFromId(sessionId);
  const baseData =
    session?.data && typeof session.data === "object" ? session.data : null;
  const updatedData = baseData
    ? { ...(baseData as Record<string, unknown>), ...patch }
    : { ...patch };
  return await setSessionData(sessionId, updatedData);
};

export const clearSessionDataKeys = async (
  sessionId: string,
  keys: string[],
) => {
  const session = await getSessionFromId(sessionId);
  if (!session) {
    return null;
  }
  const baseData =
    session.data && typeof session.data === "object" ? session.data : {};
  const updatedData = { ...(baseData as Record<string, unknown>) };
  for (const key of keys) {
    delete updatedData[key];
  }
  return await setSessionData(sessionId, updatedData);
};

export const getSessionFromId = (
  sessionId: string,
): Promise<typeof sessions.$inferSelect | undefined> =>
  db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())),
  });
