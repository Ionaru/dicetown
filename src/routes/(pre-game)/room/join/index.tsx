import { $, component$, useSignal } from "@qwik.dev/core";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
  type DocumentHead,
} from "@qwik.dev/router";
import { eq } from "drizzle-orm/pg-core/expressions";

import { getSessionContext } from "../../../../auth/session";
import ErrorMessage from "../../../../components/common/ErrorMessage";
import Title from "../../../../components/common/MainTitle";
import Button from "../../../../components/common/StandardButton";
import Subtitle from "../../../../components/common/SubTitle";
import Input from "../../../../components/common/TextInput";
import { db } from "../../../../db/db";
import { rooms } from "../../../../db/schema";
import { joinRoom, normalizeRoomCode } from "../../../../server/game-service";
import { title } from "../../../../utils/title";
import { navigateToRoom } from "../../guards";

export const usePlayerRoom = routeLoader$((requestEvent) =>
  navigateToRoom(requestEvent),
);

const findRoom = server$(async (code: string) => {
  const normalizedCode = normalizeRoomCode(code);
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, normalizedCode),
  });
  return room;
});

const joinRoomAction = server$(async function (code: string) {
  const { session } = await getSessionContext(this);
  return await joinRoom(session, code);
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
      const { code, playerId } = await joinRoomAction(roomCode.value);
      if (!code || !playerId) {
        error.value = "Failed to join room";
        return;
      }
      await nav(`/room/${code}/`);
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
