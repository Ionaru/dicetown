import DiceBox from "@3d-dice/dice-box-threejs";
import {
  $,
  component$,
  useComputed$,
  useContextProvider,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Link, routeLoader$, server$ } from "@qwik.dev/router";
import { RealtimePostgresChangesFilter } from "@supabase/supabase-js";

import { getSessionContext } from "../../../auth/session";
import { supabase } from "../../../client/supabase";
import SmallTitle from "../../../components/common/SmallTitle";
import StandardButton from "../../../components/common/StandardButton";
import SubTitle from "../../../components/common/SubTitle";
import CardMarket from "../../../components/game/CardMarket";
import GamePlayers from "../../../components/game/GamePlayers";
import LandmarkMarket from "../../../components/game/LandmarkMarket";
import { DiceBoxContext } from "../../../context/dice-box";
import { gameState, players, rooms } from "../../../db/schema";
import { mapRowToTable } from "../../../db/utils";
import { ESTABLISHMENTS } from "../../../game/constants";
import { RadioTowerDecision } from "../../../game/types";
import {
  endTurn,
  getRoomSnapshot,
  resolveDecisionForTurn,
  rollDiceForTurn,
  RoomSnapshot,
} from "../../../server/game-service";
import { getPlayerUsername } from "../../../server/players";
import { RoomStatus } from "../../../utils/enums";
import {
  runDebouncedTask,
  useDebouncedTaskState,
} from "../../../utils/use-debounced-task";

const hasPendingRadioTowerDecision = (
  snapshot: RoomSnapshot,
  playerId: string,
) =>
  snapshot.gameState?.pendingDecisions.some(
    (decision) =>
      decision.type === "radio-tower" && decision.ownerId === playerId,
  ) ?? false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const doDiceRoll = (diceBox: DiceBox, result: number[]) =>
  new Promise<void>((resolve) => {
    if (!diceBox) return;
    diceBox.onRollComplete = () => {
      diceBox?.clearDice();
      resolve();
    };
    diceBox.roll(`${result.length}d6@${result.join(",")}`);
  });

export const useGame = routeLoader$(({ params }) =>
  getRoomSnapshot(params.id ?? ""),
);

export const usePlayer = routeLoader$(async (requestEvent) => {
  const { session } = await getSessionContext(requestEvent);
  const snapshot = await requestEvent.resolveValue(useGame);
  return snapshot?.players.find(
    (player) =>
      (session.userId && player.userId === session.userId) ||
      player.anonymousUserId === session.anonymousUserId,
  );
});

export const usePlayerNames = routeLoader$(
  async (requestEvent): Promise<Map<string, string>> => {
    const snapshot = await requestEvent.resolveValue(useGame);
    const names = new Map<string, string>();
    for (const player of snapshot?.players ?? []) {
      names.set(player.id, await getPlayerUsername(player));
    }
    return names;
  },
);

const rollDice$ = server$((code, playerId, diceCount = 1) =>
  rollDiceForTurn({ code, playerId, diceCount }),
);

const endTurn$ = server$((code, playerId) => endTurn({ code, playerId }));

const resolveRadioTowerDecisionForTurn$ = server$(
  (code, playerId, decision: RadioTowerDecision) =>
    resolveDecisionForTurn({ code, playerId, decision }),
);

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
  const updateQueue = useStore<
    (typeof gameState.$inferSelect | typeof players.$inferSelect)[]
  >([]);
  const snapshot = useGame().value;
  const me = usePlayer().value;
  const playerNames = usePlayerNames().value;

  if (!snapshot) {
    return (
      <div class="flex h-full flex-col items-center justify-center">
        <SmallTitle text="Game not found" />
        <SubTitle text="The game you are looking for does not exist." />
        <Link href="/" class="mt-4">
          <StandardButton variant="secondary">
            Go back to the home page
          </StandardButton>
        </Link>
      </div>
    );
  }

  const room = snapshot.room;
  const gameSnapshot = useStore(snapshot);
  const playersInGame = useComputed$(() => gameSnapshot.players);
  const currId = useComputed$(
    () => gameSnapshot.gameState?.currentTurnPlayerId ?? null,
  );
  const isMyTurn = useComputed$(() => currId.value === me?.id);
  const mePlayer = useComputed$(() =>
    playersInGame.value.find((p) => p.id === me?.id),
  );
  const taskState = useDebouncedTaskState();

  if (gameSnapshot.room.status === RoomStatus.Finished) {
    const winner = playersInGame.value.find(
      (player) => player.id === gameSnapshot.gameState?.currentTurnPlayerId,
    );
    const winnerName = playerNames.get(winner?.id ?? "");
    return (
      <div class="flex h-full flex-col items-center justify-center">
        <SmallTitle text="Game over" />
        <SubTitle text="The game has ended! Play again to try your luck." />
        {winnerName && <SubTitle text={`The winner is ${winnerName}!`} />}
        <Link href="/" class="mt-4">
          <StandardButton variant="secondary">Back to the lobby</StandardButton>
        </Link>
      </div>
    );
  }

  const isRolling = useSignal(false);
  const isRerolling = useSignal(false);

  /**
   * This task is responsible for updating the UI and handling UI events based on the game state.
   * For example, showing a dice roll animation and visualizing the purchase of an establishment.
   */
  useTask$(
    async ({ track }) => {
      const queue = track(updateQueue);
      await runDebouncedTask(track, taskState, async () => {
        try {
          while (queue.length > 0) {
            const updatedGameState = queue.shift();
            if (!updatedGameState) continue;

            if ("phase" in updatedGameState) {
              if (
                updatedGameState.phase === "rolling" &&
                updatedGameState.lastDiceRoll
              ) {
                if (!diceBox.value) return;
                await doDiceRoll(
                  diceBox.value,
                  updatedGameState.lastDiceRoll ?? [],
                );
                isRolling.value = false;
              }

              if (
                updatedGameState.phase === "buying" &&
                !updatedGameState.hasPurchased
              ) {
                if (!diceBox.value) return;
                await doDiceRoll(
                  diceBox.value,
                  updatedGameState.lastDiceRoll ?? [],
                );
              }
              console.log("Updating game state", updatedGameState.id);
              gameSnapshot.gameState = updatedGameState;
            }

            if ("coins" in updatedGameState) {
              await sleep(250);
              gameSnapshot.players = gameSnapshot.players.map((p) =>
                p.id === updatedGameState.id ? updatedGameState : p,
              );
            }
          }
        } finally {
          isRolling.value = false;
          isRerolling.value = false;
          // No-op
        }
      });
    },
    { deferUpdates: false },
  );

  if (!gameSnapshot.gameState) {
    return (
      <div class="flex h-full flex-col items-center justify-center">
        <SmallTitle text="Critical error" />
        <SubTitle text="An error occurred while loading the game. Please try again later." />
        <Link href="/" class="mt-4">
          <StandardButton variant="secondary">
            Go back to the home page
          </StandardButton>
        </Link>
      </div>
    );
  }

  useContextProvider(DiceBoxContext, diceBox);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const box = new DiceBox("#dice-box", {
      sounds: true,
      assetPath: "/dice-box/",
      sound_dieMaterial: "plastic",
      theme_material: "plastic",
    });
    await box.initialize();
    console.debug("diceBox initialized");
    diceBox.value = box;
  });

  const gameStateUpdatesForRoom = $(
    (roomId: string): RealtimePostgresChangesFilter<"UPDATE"> => ({
      event: "UPDATE",
      schema: "public",
      table: "game_state",
      filter: `room_id=eq.${roomId}`,
    }),
  );

  const playerUpdatesForRoom = $(
    (roomId: string): RealtimePostgresChangesFilter<"UPDATE"> => ({
      event: "UPDATE",
      schema: "public",
      table: "players",
      filter: `room_id=eq.${roomId}`,
    }),
  );

  const roomUpdatesForRoom = $(
    (roomId: string): RealtimePostgresChangesFilter<"UPDATE"> => ({
      event: "UPDATE",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    }),
  );

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    const updateChannel = supabase
      .channel(`game_state-update:${room.id}`)
      .on(
        "postgres_changes",
        await gameStateUpdatesForRoom(room.id),
        (payload) => {
          const newState = mapRowToTable(gameState, payload.new);
          updateQueue.push(newState);
        },
      )
      .on(
        "postgres_changes",
        await playerUpdatesForRoom(room.id),
        (payload) => {
          const newState = mapRowToTable(players, payload.new);
          updateQueue.push(newState);
        },
      )
      .on("postgres_changes", await roomUpdatesForRoom(room.id), (payload) => {
        const newState = mapRowToTable(rooms, payload.new);
        gameSnapshot.room = newState;
      })
      .subscribe();

    cleanup(() => {
      updateChannel.unsubscribe();
    });
  });

  const rollDiceAction = $(() => {
    isRolling.value = true;
    rollDice$(room.code, me?.id, 1);
  });
  const endTurnAction = $(() => endTurn$(room.code, me?.id));

  const radioTowerRerollAction = $(() => {
    isRerolling.value = true;
    resolveRadioTowerDecisionForTurn$(room.code, me?.id, {
      type: "radio-tower",
      ownerId: me?.id ?? "",
      choice: "reroll",
    });
  });

  const radioTowerContinueAction = $(() => {
    resolveRadioTowerDecisionForTurn$(room.code, me?.id, {
      type: "radio-tower",
      ownerId: me?.id ?? "",
      choice: "keep",
    });
  });

  const establishmentsInPlay = Object.values(ESTABLISHMENTS);

  return (
    <div class="grid h-full grid-rows-[auto_1fr_auto]">
      <div>
        <p>Current turn player: {currId.value}</p>
        <ul>
          {playersInGame.value.map((player) => (
            <li
              key={player.id}
              class={`${player.id === currId.value ? "font-bold" : ""}`}
            >
              {player.id} - {player.coins}
            </li>
          ))}
        </ul>
        <pre>isMyTurn: {isMyTurn.value ? "true" : "false"}</pre>
        <h1>Game {gameSnapshot.room.code}</h1>
        <p>Coins: {mePlayer.value?.coins}</p>
        <ul>
          {Object.entries(mePlayer?.value?.cards ?? {}).map(([card, count]) => (
            <li key={card}>
              {card} x {count}
            </li>
          ))}
        </ul>
      </div>
      <div>
        {isMyTurn.value &&
          hasPendingRadioTowerDecision(gameSnapshot, me?.id ?? "") && (
            <>
              <span>
                You rolled{" "}
                {gameSnapshot.gameState?.lastDiceRoll?.reduce(
                  (sum, value) => sum + value,
                  0,
                )}
              </span>
              <StandardButton onClick$={radioTowerRerollAction}>
                Reroll
              </StandardButton>
              <StandardButton onClick$={radioTowerContinueAction}>
                Continue
              </StandardButton>
            </>
          )}
        {isMyTurn.value &&
          gameSnapshot.gameState?.phase === "rolling" &&
          !hasPendingRadioTowerDecision(gameSnapshot, me?.id ?? "") &&
          !isRolling.value && (
            <StandardButton onClick$={rollDiceAction}>Roll Dice</StandardButton>
          )}
        {isMyTurn.value &&
          gameSnapshot.gameState?.phase === "buying" &&
          !gameSnapshot.gameState.hasPurchased && (
            <>
              <LandmarkMarket cards={mePlayer.value?.landmarks ?? {}} />
              <CardMarket cards={gameSnapshot.gameState.marketState} />
              <StandardButton onClick$={endTurnAction}>Skip</StandardButton>
            </>
          )}
        {isMyTurn.value &&
          gameSnapshot.gameState?.phase === "buying" &&
          gameSnapshot.gameState.hasPurchased && (
            <StandardButton onClick$={endTurnAction}>End turn</StandardButton>
          )}
      </div>
      <GamePlayers
        players={playersInGame.value}
        playerNames={playerNames}
        meId={me?.id ?? ""}
        currId={currId.value ?? ""}
        establishmentsInPlay={establishmentsInPlay}
      />
    </div>
  );
});
