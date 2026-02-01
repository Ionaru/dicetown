import { getTableColumns, InferSelectModel, Table } from "drizzle-orm";
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

/**
 * Convert a raw object to a Drizzle row
 */
export const mapRowToTable = <TTable extends Table>(
  table: TTable,
  row: Record<string, unknown>,
): InferSelectModel<TTable> => {
  const columns = getTableColumns(table);

  const result: Record<string, unknown> = {};

  for (const [jsKey, column] of Object.entries(columns)) {
    const dbKey = (column as any).name;
    if (dbKey in row) {
      result[jsKey] = row[dbKey];
    }
  }

  return result as InferSelectModel<TTable>;
};
