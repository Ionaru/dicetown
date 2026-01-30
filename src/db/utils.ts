import { PgPreparedQuery } from "drizzle-orm/pg-core";

/**
 * Wrap a Drizzle prepared query with explicit input params
 * and inferred output type.
 */
export const registerPreparedQuery =
  <TParams extends Record<string, unknown>>() =>
  <TPrepared extends PgPreparedQuery<any>>(prepared: TPrepared) => ({
    execute: (params: TParams): ReturnType<TPrepared["execute"]> =>
      prepared.execute(params) as ReturnType<TPrepared["execute"]>,
  });
