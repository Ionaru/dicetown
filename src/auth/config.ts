export const rpName = "Dicetown";

export const rpID = process.env.RP_ID ?? "localhost";
export const origin = process.env.RP_ORIGIN ?? `https://${rpID}`;

const defaultSessionTtlSeconds = 60 * 60 * 24 * 30;
const parsedSessionTtlSeconds = Number(
  process.env.SESSION_TTL_SECONDS ?? defaultSessionTtlSeconds,
);
export const sessionTtlSeconds = Number.isFinite(parsedSessionTtlSeconds)
  ? parsedSessionTtlSeconds
  : defaultSessionTtlSeconds;
