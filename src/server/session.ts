import type { RequestEventBase } from "@builder.io/qwik-city";

const cookieOptions = {
  path: "/",
  sameSite: "lax" as const,
};

export const requirePlayerId = (event: RequestEventBase): string => {
  const playerId = event.cookie.get("playerId")?.value;
  if (!playerId) {
    throw new Error("Missing player session");
  }
  return playerId;
};

export const setRoomSession = (
  event: RequestEventBase,
  data: { playerId: string; roomCode: string },
) => {
  event.cookie.set("playerId", data.playerId, cookieOptions);
  event.cookie.set("roomCode", data.roomCode, cookieOptions);
};
