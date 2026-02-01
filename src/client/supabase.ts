import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

declare global {
  var __dicetownSupabaseClient: SupabaseClient | undefined;
}

const createSupabaseClient = (): SupabaseClient =>
  createClient(
    getEnv("PUBLIC_SUPABASE_URL"),
    getEnv("PUBLIC_SUPABASE_ANON_KEY"),
  );

export const supabase =
  globalThis.__dicetownSupabaseClient ?? createSupabaseClient();

globalThis.__dicetownSupabaseClient = supabase;
