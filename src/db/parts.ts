import { sql } from "drizzle-orm";
import { and, isNotNull, eq } from "drizzle-orm/pg-core/expressions";

import { players } from "./schema";

export const playerUserIdIfNotNull = and(
  isNotNull(players.userId),
  eq(players.userId, sql.placeholder("userId")),
);

export const playerAnonymousUserIdIfNotNull = and(
  isNotNull(players.anonymousUserId),
  eq(players.anonymousUserId, sql.placeholder("anonymousUserId")),
);
