import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db";
import { anonymousUsers } from "../schema";
import { registerPreparedQuery } from "../utils";

export const Q_getAnonymousUserById = registerPreparedQuery<{
  id: string;
}>()(
  db.query.anonymousUsers
    .findFirst({
      where: eq(anonymousUsers.id, sql.placeholder("id")),
    })
    .prepare("Q_getAnonymousUserById"),
);
