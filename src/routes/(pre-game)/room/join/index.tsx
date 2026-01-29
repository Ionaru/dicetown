import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  server$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";

import ErrorMessage from "../../../../components/common/ErrorMessage";
import Title from "../../../../components/common/MainTitle";
import Button from "../../../../components/common/StandardButton";
import Subtitle from "../../../../components/common/SubTitle";
import Input from "../../../../components/common/TextInput";
import { db } from "../../../../db/db";
import { rooms } from "../../../../db/schema";
import { normalizeRoomCode } from "../../../../server/game-service";
import { title } from "../../../../utils/title";

const findRoom = server$(async (code: string) => {
  const normalizedCode = normalizeRoomCode(code);
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, normalizedCode),
  });
  return room;
});

export default component$(() => {
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
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <Title />
      <Subtitle text="Enter the room code to join a game." />
      <form onsubmit$={joinRoom} preventdefault:submit>
        <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
          <Input value={roomCode} placeholder="Enter room code" required />
          <Button type="submit" isLoading={isLoading.value}>
            Join Game
          </Button>
          {error.value && <ErrorMessage message={error.value} />}
          <Link class="col-span-2" href="/">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </form>
    </div>
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
