import type { RequestEvent, RequestEventBase } from "@builder.io/qwik-city";
import type { RoomSnapshot } from "./game-service";

export type ApiSuccess = {
  ok: true;
  snapshot?: RoomSnapshot;
};

export type ApiFailure = {
  ok: false;
  message: string;
  snapshot?: RoomSnapshot | null;
};

export const isJsonRequest = (event: RequestEventBase): boolean =>
  event.request.headers.get("accept")?.includes("application/json") ?? false;

export const respondJsonOk = (
  event: RequestEvent,
  snapshot?: RoomSnapshot,
): void => {
  event.json(200, { ok: true, snapshot } satisfies ApiSuccess);
};

export const respondJsonError = (
  event: RequestEvent,
  status: number,
  message: string,
  snapshot?: RoomSnapshot | null,
): void => {
  event.json(status, { ok: false, message, snapshot } satisfies ApiFailure);
};

export const toUserMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : "";
  switch (raw) {
    case "Not your turn":
      return "It is not your turn yet.";
    case "Game has not started":
      return "Start the game before taking actions.";
    case "Cannot roll dice in the current phase":
      return "You can only roll during the roll phase.";
    case "Cannot buy in the current phase":
      return "You can only buy during the buy phase.";
    case "Cannot end turn in the current phase":
      return "You can only end your turn after buying.";
    case "Resolve the radio tower decision first":
      return "Choose whether to reroll before continuing.";
    case "You can only buy one item per turn":
      return "You can only buy one item per turn.";
    case "That establishment is sold out":
      return "That establishment is sold out.";
    case "You can only own one of that establishment":
      return "You can only own one copy of that establishment.";
    case "You don't have enough coins":
      return "You do not have enough coins.";
    case "That establishment cannot be purchased right now":
      return "You cannot buy that establishment right now.";
    case "Establishment purchase not allowed":
      return "You cannot buy that establishment right now.";
    case "You already built that landmark":
      return "You already built that landmark.";
    case "That landmark cannot be built right now":
      return "You cannot build that landmark right now.";
    case "Landmark purchase not allowed":
      return "You cannot build that landmark right now.";
    case "No roll to resolve":
      return "There is no roll to resolve yet.";
    case "Room not found":
      return "Room not found.";
    case "Room already started":
      return "The game has already started.";
    case "Room is full":
      return "This room is already full.";
    default:
      return "That action is not allowed right now.";
  }
};
