import {
  $,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  server$,
  useNavigate,
} from "@builder.io/qwik-city";
import { eq } from "drizzle-orm/pg-core/expressions";

import { getSessionContext } from "../../../../auth/session";
import { getUserNameFromId } from "../../../../auth/username";
import { supabase } from "../../../../client/supabase";
import SmallTitle from "../../../../components/common/SmallTitle";
import Button from "../../../../components/common/StandardButton";
import Subtitle from "../../../../components/common/SubTitle";
import { db } from "../../../../db/db";
import { findPlayerInRoom } from "../../../../db/queries/players";
import {
  Q_findRoomFromCodeWithPlayers,
  Q_findRoomWithPlayersById,
} from "../../../../db/queries/rooms";
import { players, rooms } from "../../../../db/schema";
import { mapRowToTable } from "../../../../db/utils";
import { MAX_PLAYERS, MIN_PLAYERS } from "../../../../game";
import {
  addAiPlayer,
  joinRoom,
  removeAiPlayer,
  startGame,
} from "../../../../server/game-service";
import { getPlayerUsername, leaveRoom } from "../../../../server/players";
import { navigateToGame } from "../../guards";

export const useGame = routeLoader$((requestEvent) =>
  navigateToGame(requestEvent),
);

export const useRoom = routeLoader$(async ({ params, status }) => {
  const room = await Q_findRoomFromCodeWithPlayers.execute({ code: params.id });
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

const getUsername = server$((player: typeof players.$inferSelect) =>
  getPlayerUsername(player),
);
const removeAiPlayer$ = server$((playerId: string) => removeAiPlayer(playerId));
const addAiPlayer$ = server$((roomId: string) => addAiPlayer(roomId));
const startGame$ = server$((roomId: string) => startGame(roomId));

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
  await leaveRoom(player.id);
  const room = await Q_findRoomWithPlayersById.execute({ id });
  if (!room) {
    throw new Error("Room not found");
  }
  if (room.players.filter((p) => !p.isAi).length === 0) {
    await db.delete(rooms).where(eq(rooms.id, id));
  }
});

const joinRoom$ = server$(async function (id: string) {
  const { session } = await getSessionContext(this);
  return await joinRoom(session, id);
});

export default component$(() => {
  const room = useRoom().value;
  const nav = useNavigate();
  const hostUserName = useHostUsername().value;
  const currentUserId = useCurrentUserId().value;
  const playersSignal = useSignal<(typeof players.$inferSelect)[]>([]);

  useTask$(() => {
    if (room?.id) {
      playersSignal.value = room.players;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    if (room?.id) {
      const deleteChannel = supabase
        .channel(`players-delete`)
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "players",
          },
          (payload) => {
            if (
              playersSignal.value.some((player) => player.id === payload.old.id)
            ) {
              playersSignal.value = playersSignal.value.filter(
                (player) => player.id !== payload.old.id,
              );
            }
          },
        )
        .subscribe();

      const insertChannel = supabase
        .channel(`players-insert:${room.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${room.id}`,
          },
          (payload) => {
            playersSignal.value = [
              ...playersSignal.value,
              mapRowToTable(players, payload.new),
            ];
          },
        )
        .subscribe();

      cleanup(() => {
        deleteChannel.unsubscribe();
        insertChannel.unsubscribe();
      });
    }
  });

  if (room) {
    const isInRoom = playersSignal.value.some(
      (player) =>
        player.userId === currentUserId ||
        player.anonymousUserId === currentUserId,
    );
    const isHost = currentUserId === room.hostId;
    const leaveRoomAction = $(async () => {
      await leaveRoom$(room.id);
      nav("/");
    });

    const addAiPlayerAction = $(async () => {
      await addAiPlayer$(room.id);
    });

    const joinRoomAction = $(async () => {
      await joinRoom$(room.id);
    });

    const startGameAction = $(async () => {
      await startGame$(room.code);
      nav(`/game/${room.code}`);
    });

    return (
      <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
        <SmallTitle class="select-text" text={`Room ${room.code}`} />
        <p class="text-2xl capitalize">Host: {hostUserName}</p>
        <p class="text-2xl">Status: {room.status}</p>
        <p class="text-2xl">Players: {playersSignal.value.length}/5</p>
        <ul>
          {playersSignal.value.map((player) => {
            const removeAiPlayerAction = $(() => removeAiPlayer$(player.id));
            const isYou =
              currentUserId === player.userId ||
              currentUserId === player.anonymousUserId;
            const removeButton = (
              <button
                onClick$={removeAiPlayerAction}
                class="bg-mk-card-red hover:bg-mk-card-red/80 m-0.5 cursor-pointer rounded-md px-2 py-2 text-sm text-white transition hover:scale-105"
              >
                Remove
              </button>
            );
            return (
              <li
                key={player.id}
                class={`text-center text-2xl ${isYou ? "font-bold" : ""}`}
              >
                {getUsername(player)} {isYou ? "(You)" : ""}
                {isHost && player.isAi ? removeButton : ""}
              </li>
            );
          })}
          {new Array(MAX_PLAYERS - playersSignal.value.length)
            .fill(0)
            .map((_, index) => (
              <li key={"open-slot-" + index} class="text-center text-2xl">
                -- open slot --
              </li>
            ))}
        </ul>
        <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
          {isHost && (
            <Button
              disabled={playersSignal.value.length >= MAX_PLAYERS}
              onClick$={addAiPlayerAction}
            >
              Add AI Player
            </Button>
          )}
          {isHost && (
            <Button
              disabled={playersSignal.value.length < MIN_PLAYERS}
              onClick$={startGameAction}
            >
              Start Game
            </Button>
          )}
          {!isInRoom && <Button onClick$={joinRoomAction}>Join Game</Button>}
          <Button
            class="col-span-2"
            variant="secondary"
            onClick$={leaveRoomAction}
          >
            Leave Room
          </Button>
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
