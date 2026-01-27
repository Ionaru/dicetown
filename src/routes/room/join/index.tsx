import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";

import { getUserName } from "../../../auth/username";
import Button from "../../../components/common/button";
import { db } from "../../../db/db";
import { rooms } from "../../../db/schema";
import { normalizeRoomCode } from "../../../server/game-service";
import { title } from "../../../utils/title";

export const useAnonymousUserName = routeLoader$(async (requestEvent) => await getUserName(requestEvent));

const findRoom = server$(async (code: string) => {
  const normalizedCode = normalizeRoomCode(code);
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, normalizedCode),
  });
  return room;
});

export default component$(() => {
  const { name } = useAnonymousUserName().value;
  const nav = useNavigate();
  const roomCode = useSignal("");
  const isLoading = useSignal(false);
  const error = useSignal<string | null>(null);
  const joinRoom = $(async () => {
    error.value = null;
    const room = await findRoom(roomCode.value);
    if (!room) {
      error.value = "Room not found";
      return;
    }
    try {
      isLoading.value = true;
      await nav(`/room/${roomCode.value}/`);
    } finally {
      isLoading.value = false;
    }
  });
  return (
    <>
      <div class="absolute top-4 right-4 text-xl capitalize select-none">
        <p>👤 Anonymous {name}</p>
      </div>
      <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
        <h1 class="text-8xl font-bold">{title}</h1>
        <p class="text-xl">Enter the room code to join a game.</p>
        <form onsubmit$={joinRoom} preventdefault:submit>
          <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
            <input
              class="border-mk-blue bg-mk-white w-full rounded-md border px-4 py-2 text-center"
              type="text"
              placeholder="Enter room code"
              value={roomCode.value}
              oninput$={(e) =>
                (roomCode.value = (e.target as HTMLInputElement).value)
              }
              required
            />
            <Button type="submit" isLoading={isLoading.value}>
              Join Game
            </Button>
            {error.value && (
              <p class="col-span-2 text-center text-xl text-red-500">
                ⚠️
                {error.value}
              </p>
            )}
            <Link class="col-span-2" href="/">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: `Join`,
  meta: [
    {
      name: "description",
      content: `${title} is a game about rolling dice and building towns.`,
    },
  ],
};
