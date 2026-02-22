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
import EstablishmentMarket from "../../../components/game/EstablishmentMarket";
import GamePlayers from "../../../components/game/GamePlayers";
import LandmarkMarket from "../../../components/game/LandmarkMarket";
import { DiceBoxContext } from "../../../context/dice-box";
import { gameState, players, rooms } from "../../../db/schema";
import { mapRowToTable } from "../../../db/utils";
import { ESTABLISHMENTS } from "../../../game/constants";
import { canRollTwoDice } from "../../../game/engine";
import { RadioTowerDecision } from "../../../game/types";
import {
  endTurn,
  getRoomSnapshot,
  resolveDecisionForTurn,
  RoomSnapshot,
} from "../../../server/game-service";
import { getPlayerUsername } from "../../../server/players";
import { RoomStatus, TurnPhase } from "../../../utils/enums";
import {
  runDebouncedTask,
  useDebouncedTaskState,
} from "../../../utils/use-debounced-task";
import RollDice from "../../../components/game/actions/RollDice";
import EndTurn from "../../../components/game/actions/EndTurn";

type GamestateUpdate =
  | typeof gameState.$inferSelect
  | typeof players.$inferSelect;

const shouldShowDiceRoll = (
  snapshot: RoomSnapshot,
  update: GamestateUpdate,
): boolean => {
  if ("phase" in update) {
    if (
      snapshot.gameState?.phase === TurnPhase.Rolling &&
      update.lastDiceRoll
    ) {
      return true;
    }
    return false;
  }
  return false;
};

const shouldShowIncome = (
  snapshot: RoomSnapshot,
  update: GamestateUpdate,
): boolean => {
  if ("phase" in update) {
    if (
      snapshot.gameState?.phase === TurnPhase.Rolling &&
      update.phase === TurnPhase.Buying
    ) {
      console.log("income?");
      return true;
    }
  }
  return false;
};

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

const endTurn$ = server$((code, playerId) => endTurn({ code, playerId }));

const resolveRadioTowerDecisionForTurn$ = server$(
  (code, playerId, decision: RadioTowerDecision) =>
    resolveDecisionForTurn({ code, playerId, decision }),
);

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
  const updateQueue = useStore<GamestateUpdate[]>([]);
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
  const canRoll2Dice = useComputed$(() =>
    mePlayer.value ? canRollTwoDice(mePlayer.value) : false,
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
        <Link href={`/room/${room.code}`} class="mt-4">
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
              if (shouldShowDiceRoll(gameSnapshot, updatedGameState)) {
                if (!diceBox.value) return;
                await doDiceRoll(
                  diceBox.value,
                  updatedGameState.lastDiceRoll ?? [],
                );
                isRolling.value = false;
              }

              if (shouldShowIncome(gameSnapshot, updatedGameState)) {
                console.log("income!");
              }

              gameSnapshot.gameState = updatedGameState;
            }

            if ("coins" in updatedGameState) {
              await sleep(20);
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
    const subscription = supabase
      .channel(`game:${room.id}`)
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
      console.log("cleanup game", room.id);
      supabase.removeChannel(subscription);
    });
  });

  const endTurnAction = $(() => endTurn$(room.code, me?.id));

  const radioTowerRerollAction = $(() => {
    isRolling.value = true;
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

  const marketDialogRef = useSignal<HTMLDialogElement>();

  return (
    <>
      <div class="grid h-full grid-rows-[auto_1fr_auto]">
      <GamePlayers
          players={playersInGame.value}
          playerNames={playerNames}
          meId={me?.id ?? ""}
          currId={currId.value ?? ""}
          establishmentsInPlay={establishmentsInPlay}
        />
        <div class="text-center">
          <h1 class="text-4xl font-bold">Game {gameSnapshot.room.code}</h1>
          {!isMyTurn.value && (
            <h2 class="text-2xl">
              It's {playerNames.get(currId.value ?? "")}'s turn
            </h2>
          )}
          {isMyTurn.value && (
            <h2 class="text-2xl font-bold">It's your turn!</h2>
          )}
        </div>
        <div class="m-8 flex flex-col items-center justify-center gap-4">
          {isMyTurn.value &&
            !isRolling.value &&
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
              <RollDice code={room.code} playerId={me?.id ?? ""} canRoll2Dice={canRoll2Dice.value} isRolling={isRolling} />
            )}
          {isMyTurn.value &&
            gameSnapshot.gameState?.phase === "buying" &&
            !gameSnapshot.gameState.hasPurchased && (
              <div class="m-8 flex flex-col items-center justify-center gap-4">
                <LandmarkMarket
                  cards={mePlayer.value?.landmarks ?? {}}
                  coins={mePlayer.value?.coins ?? 0}
                />
                <StandardButton
                  class="w-auto px-8"
                  onClick$={() => marketDialogRef.value?.showModal()}
                >
                  Open Market
                </StandardButton>
                <StandardButton onClick$={endTurnAction}>Skip</StandardButton>
              </div>
            )}
          {isMyTurn.value &&
            gameSnapshot.gameState?.phase === "buying" &&
            gameSnapshot.gameState.hasPurchased && (
              <EndTurn code={room.code} playerId={me?.id ?? ""} />
            )}
        </div>
      </div>

      <dialog
        ref={marketDialogRef}
        class="select-none fixed inset-0 m-auto max-h-[85vh] w-[min(92vw,72rem)] overflow-y-auto rounded-md border-0 bg-mk-card-sky p-8 shadow-md backdrop:bg-black/40"
      >
        <h2 class="text-4xl">Establishment Market</h2>
        <div class="mt-4">
          <EstablishmentMarket
            cards={gameSnapshot.gameState.marketState}
            coins={mePlayer.value?.coins ?? 0}
          />
        </div>
        <div class="mt-6 flex justify-end">
          <StandardButton class="w-auto px-8" onClick$={() => marketDialogRef.value?.close()}>
            Close
          </StandardButton>
        </div>
      </dialog>
    </>
  );
});
