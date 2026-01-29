import { $, component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
} from "@builder.io/qwik-city";
import { asc, eq } from "drizzle-orm/pg-core/expressions";

import { getUserNameFromId } from "../../../../auth/username";
import SmallTitle from "../../../../components/common/SmallTitle";
import Subtitle from "../../../../components/common/SubTitle";
import { db } from "../../../../db/db";
import { players, rooms } from "../../../../db/schema";

export const useRoom = routeLoader$(async ({ params, status }) => {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, params.id),
    with: {
      players: {
        orderBy: [asc(players.turnOrder)],
      },
    },
  });
  if (!room) {
    status(404);
  }
  return room;
});

export const useHostUsername = routeLoader$(async ({ resolveValue }) => {
  const room = await resolveValue(useRoom);
  if (!room) {
    return "Unknown";
  }
  const user = await getUserNameFromId(room.hostId);
  return user.name;
});

export const joinRoom = server$(async (code: string) => {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, code),
  });
  if (!room) {
    throw new Error("Room not found");
  }
  await db.insert(players).values({
    roomId: room.id,
    name: "Guest",
    isAi: false,
    turnOrder: 1,
    // turnOrder: room.players.length + 1,
  });
  return room;
});

export default component$(() => {
  const room = useRoom().value;
  const nav = useNavigate();
  const hostUserName = useHostUsername().value;
  if (room) {
    const joinRoomAction = $(async () => {
      const joinedRoom = await joinRoom(room.code);
      if (!joinedRoom) {
        return;
      }
      nav(`/room/${joinedRoom.code}/`);
    });

    return (
      <div class="flex h-full flex-col items-center justify-center">
        <SmallTitle title={`Room ${room.code}`} />
        <p class="text-2xl capitalize">Host: {hostUserName}</p>
        <p class="text-2xl">Status: {room.status}</p>
        <p class="text-2xl">Players: {room.players.length}</p>
        <ul class="list-disc">
          {room.players.map((player) => (
            <li key={player.id} class="text-2xl">
              {player.name}
            </li>
          ))}
        </ul>
        <button onClick$={joinRoomAction}>Join Room</button>
      </div>
    );
  }

  return (
    <div class="flex h-full flex-col items-center justify-center">
      <SmallTitle title="Room not found" />
      <Subtitle text="The room you are looking for does not exist." />
      <Link href="/" class="text-blue-500">
        Go back to the home page
      </Link>
    </div>
  );
});
