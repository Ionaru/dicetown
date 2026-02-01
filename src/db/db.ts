import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { dbUrl } from "./config";
import * as schema from "./schema";

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(dbUrl, { prepare: false });
export const db = drizzle(client, { schema, casing: "snake_case" });
