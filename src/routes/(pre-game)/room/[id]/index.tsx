import { $, component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
} from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";

import { getSessionContext } from "../../../../auth/session";
import { getUserNameFromId } from "../../../../auth/username";
import SmallTitle from "../../../../components/common/SmallTitle";
import Button from "../../../../components/common/StandardButton";
import Subtitle from "../../../../components/common/SubTitle";
import { db } from "../../../../db/db";
import { findPlayerInRoom } from "../../../../db/queries/players";
import { findRoomFromCodeWithPlayers } from "../../../../db/queries/rooms";
import { players } from "../../../../db/schema";
import { getPlayerUsername } from "../../../../server/players";

const leaveRoom = async (playerId: string) => {
  await db.delete(players).where(eq(players.id, playerId));
};

const leaveRoom$ = server$(async function (id: string) {
  const { session } = await getSessionContext(this);
  const player = await findPlayerInRoom.execute({
    roomId: id,
    userId: session.userId,
    anonymousUserId: session.anonymousUserId,
  });
  if (!player) {
    throw new Error("Player not found");
  }
  return await leaveRoom(player.id);
});

export const useRoom = routeLoader$(async ({ params, status }) => {
  const room = await findRoomFromCodeWithPlayers.execute({ code: params.id });
  if (!room) {
    status(404);
  }
  return room;
});

export const useHostUsername = routeLoader$(async (event) => {
  const room = await event.resolveValue(useRoom);
  if (!room) {
    return "Unknown room";
  }
  return getUserNameFromId(room.hostId);
});

export const useCurrentUserId = routeLoader$(async (event) => {
  const { session } = await getSessionContext(event);
  return session.userId ?? session.anonymousUserId ?? null;
});

export const getUsername = server$(
  async (player: typeof players.$inferSelect) => {
    return getPlayerUsername(player);
  },
);

export default component$(() => {
  const room = useRoom().value;
  const nav = useNavigate();
  const hostUserName = useHostUsername().value;
  const currentUserId = useCurrentUserId().value;
  if (room) {
    const isHost = currentUserId === room.hostId;
    const leaveRoomAction = $(async () => {
      await leaveRoom$(room.id);
      nav("/");
    });

    return (
      <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
        <SmallTitle class="select-text" text={`Room ${room.code}`} />
        <p class="text-2xl capitalize">Host: {hostUserName}</p>
        <p class="text-2xl">Status: {room.status}</p>
        <p class="text-2xl">Players: {room.players.length}/5</p>
        <ol class="list-decimal">
          {room.players.map((player) => (
            <li key={player.id} class="text-2xl">
              {getUsername(player)}
            </li>
          ))}
        </ol>
        <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
          <Button variant="secondary" onClick$={leaveRoomAction}>
            Leave Room
          </Button>
          {isHost && <Button onClick$={leaveRoomAction}>Start Game</Button>}
        </div>
      </div>
    );
  }

  return (
    <div class="flex h-full flex-col items-center justify-center">
      <SmallTitle text="Room not found" />
      <Subtitle text="The room you are looking for does not exist." />
      <Link href="/" class="text-blue-500">
        Go back to the home page
      </Link>
    </div>
  );
});
