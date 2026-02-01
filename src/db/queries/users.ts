import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db";
import { users } from "../schema";
import { registerPreparedQuery } from "../utils";

export const Q_getUserById = registerPreparedQuery<{
  id: string;
}>()(
  db.query.users
    .findFirst({
      where: eq(users.id, sql.placeholder("id")),
    })
    .prepare("Q_getUserById"),
);
