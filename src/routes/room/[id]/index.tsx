import { component$ } from "@builder.io/qwik";
import { Link, routeAction$, routeLoader$, server$ } from "@builder.io/qwik-city";
import { asc, eq } from "drizzle-orm/pg-core/expressions";

import { getUserNameFromId } from "../../../auth/username";
import { db } from "../../../db/db";
import { players, rooms } from "../../../db/schema";

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
    return { success: false, error: "Room not found" };
  }
  return { success: true, room };
});

export const useJoinRoom = routeAction$(async ({ code }) => {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, code),
  });
  if (!room) {
    return { success: false, error: "Room not found" };
  }
  await db.insert(players).values({
    roomId: room.id,
    name: "Guest",
    isAi: false,
    turnOrder: 1,
    // turnOrder: room.players.length + 1,
  });
  return { success: true, room };
});

export default component$(() => {
  const room = useRoom().value;
  const hostUserName = useHostUsername().value;
  const joinRoom = useJoinRoom();
  if (room) {
    return (
      <div class="flex h-full flex-col items-center justify-center">
        <h1 class="text-4xl font-bold">Room {room.code}</h1>
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
        <button onClick$={() => joinRoom.submit({ code: room.code })}>Join Room</button>
      </div>
    );
  }

  return (
    <div class="flex h-full flex-col items-center justify-center">
      <h1 class="text-4xl font-bold">Room not found</h1>
      <p class="text-2xl">The room you are looking for does not exist.</p>
      <Link href="/" class="text-blue-500">
        Go back to the home page
      </Link>
    </div>
  );
});
