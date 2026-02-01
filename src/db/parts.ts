import { sql } from "drizzle-orm";
import { and, isNotNull, eq } from "drizzle-orm/pg-core/expressions";

import { players } from "./schema";

export const buildPlayerUserIdIfNotNullCondition = (placeholderName: string) =>
  and(
    isNotNull(players.userId),
    eq(players.userId, sql.placeholder(placeholderName)),
  );

export const buildPlayerAnonymousUserIdIfNotNullCondition = (
  placeholderName: string,
) =>
  and(
    isNotNull(players.anonymousUserId),
    eq(players.anonymousUserId, sql.placeholder(placeholderName)),
  );
export const playerUserIdIfNotNull = and(
  isNotNull(players.userId),
  eq(players.userId, sql.placeholder("userId")),
);

export const playerAnonymousUserIdIfNotNull = and(
  isNotNull(players.anonymousUserId),
  eq(players.anonymousUserId, sql.placeholder("anonymousUserId")),
);
