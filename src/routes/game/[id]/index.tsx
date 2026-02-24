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
import BusinessCenterPicker from "../../../components/game/actions/BusinessCenterPicker";
import EndTurn from "../../../components/game/actions/EndTurn";
import IncomeDisplay from "../../../components/game/actions/IncomeDisplay";
import RollDice from "../../../components/game/actions/RollDice";
import TvStationPicker from "../../../components/game/actions/TvStationPicker";
import EstablishmentMarket from "../../../components/game/EstablishmentMarket";
import GamePlayers from "../../../components/game/GamePlayers";
import LandmarkMarket from "../../../components/game/LandmarkMarket";
import { DiceBoxContext } from "../../../context/dice-box";
import { gameState, players, rooms } from "../../../db/schema";
import { mapRowToTable } from "../../../db/utils";
import { ESTABLISHMENTS, type EstablishmentId } from "../../../game/constants";
import {
  deriveTurnUIState,
  getIncomeSteps,
  getNextIncomeStep,
  groupTransactionsByColor,
  type IncomeStep,
  type TurnUIState,
} from "../../../game/turn-ui-state";
import type { PendingDecisionResolution } from "../../../game/types";
import {
  endTurn,
  getRoomSnapshot,
  resolveDecisionForTurn,
} from "../../../server/game-service";
import { getPlayerUsername } from "../../../server/players";
import { RoomStatus } from "../../../utils/enums";
import {
  runDebouncedTask,
  useDebouncedTaskState,
} from "../../../utils/use-debounced-task";

type GamestateUpdate =
  | typeof gameState.$inferSelect
  | typeof players.$inferSelect;

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

const diceChanged = (
  a: number[] | null | undefined,
  b: number[] | null | undefined,
): boolean => {
  if (!a && !b) return false;
  if (!a || !b) return true;
  return a.length !== b.length || a.some((v, i) => v !== b[i]);
};

const extractTransactions = (
  update: typeof gameState.$inferSelect,
): import("../../../game/types").Transaction[] => {
  if (
    "lastRollTransactions" in update &&
    Array.isArray(update.lastRollTransactions)
  ) {
    return update.lastRollTransactions;
  }
  return [];
};

const shouldStartIncomeSequence = (
  oldPhase: string | undefined,
  update: typeof gameState.$inferSelect,
): boolean => {
  const txns = extractTransactions(update);
  return oldPhase === "rolling" && update.phase !== "rolling" && txns.length > 0;
};

function startIncomeSequence(
  update: typeof gameState.$inferSelect,
): IncomeStep | null {
  const txns = extractTransactions(update);
  const grouped = groupTransactionsByColor(txns);
  const steps = getIncomeSteps(grouped);
  return steps[0] ?? null;
}

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

const endTurn$ = server$((code: string, playerId: string) =>
  endTurn({ code, playerId }),
);

const resolveDecision$ = server$(
  (code: string, playerId: string, decision: PendingDecisionResolution) =>
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
        <Link href={`/room/${room.code}`} class="mt-4">
          <StandardButton variant="secondary">Back to the lobby</StandardButton>
        </Link>
      </div>
    );
  }

  const isRolling = useSignal(false);
  const incomeStep = useSignal<IncomeStep | null>(null);

  const turnUIState = useComputed$<TurnUIState>(() => {
    if (!gameSnapshot.gameState || !me) {
      return { kind: "not-my-turn" };
    }
    const myPlayer = gameSnapshot.players.find((p) => p.id === me.id);
    if (!myPlayer) {
      return { kind: "not-my-turn" };
    }
    return deriveTurnUIState({
      gameState: gameSnapshot.gameState,
      myPlayerId: me.id,
      myPlayer,
      players: gameSnapshot.players,
      isRolling: isRolling.value,
      incomeStep: incomeStep.value,
    });
  });

  useTask$(
    async ({ track }) => {
      const queue = track(updateQueue);
      await runDebouncedTask(track, taskState, async () => {
        try {
          while (queue.length > 0) {
            const update = queue.shift();
            if (!update) continue;

            if ("phase" in update) {
              const oldDice = gameSnapshot.gameState?.lastDiceRoll;
              const oldPhase = gameSnapshot.gameState?.phase;

              if (diceChanged(oldDice, update.lastDiceRoll) && update.lastDiceRoll && diceBox.value) {
                await doDiceRoll(diceBox.value, update.lastDiceRoll);
                isRolling.value = false;
              }

              if (shouldStartIncomeSequence(oldPhase, update)) {
                incomeStep.value = startIncomeSequence(update);
              }

              gameSnapshot.gameState = update;
            }

            if ("coins" in update) {
              await sleep(20);
              gameSnapshot.players = gameSnapshot.players.map((p) =>
                p.id === update.id ? update : p,
              );
            }
          }
        } finally {
          isRolling.value = false;
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

  const advanceIncomeStep = $(() => {
    const txns = gameSnapshot.gameState?.lastRollTransactions ?? [];
    const grouped = groupTransactionsByColor(txns);
    const steps = getIncomeSteps(grouped);
    const next = getNextIncomeStep(steps, incomeStep.value);
    incomeStep.value = next;
  });

  const endTurnAction = $(() => endTurn$(room.code, me?.id ?? ""));

  const radioTowerRerollAction = $(() => {
    isRolling.value = true;
    resolveDecision$(room.code, me?.id ?? "", {
      type: "radio-tower",
      ownerId: me?.id ?? "",
      choice: "reroll",
    });
  });

  const radioTowerContinueAction = $(() => {
    resolveDecision$(room.code, me?.id ?? "", {
      type: "radio-tower",
      ownerId: me?.id ?? "",
      choice: "keep",
    });
  });

  const tvStationAction = $((targetPlayerId: string) => {
    resolveDecision$(room.code, me?.id ?? "", {
      type: "tv-station",
      ownerId: me?.id ?? "",
      targetPlayerId,
    });
  });

  const businessCenterAction = $(
    (
      targetPlayerId: string,
      giveCardId: EstablishmentId,
      takeCardId: EstablishmentId,
    ) => {
      resolveDecision$(room.code, me?.id ?? "", {
        type: "business-center",
        ownerId: me?.id ?? "",
        targetPlayerId,
        giveCardId,
        takeCardId,
      });
    },
  );

  const establishmentsInPlay = Object.values(ESTABLISHMENTS);
  const marketDialogRef = useSignal<HTMLDialogElement>();

  const isMyTurn =
    gameSnapshot.gameState.currentTurnPlayerId === me?.id;

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
          {!isMyTurn && (
            <h2 class="text-2xl">
              It's {playerNames.get(currId.value ?? "")}'s turn
            </h2>
          )}
          {isMyTurn && (
            <h2 class="text-2xl font-bold">It's your turn!</h2>
          )}
        </div>
        <div class="m-8 flex flex-col items-center justify-center gap-4">
          {turnUIState.value.kind === "roll-dice" && (
            <RollDice
              code={room.code}
              playerId={me?.id ?? ""}
              canRoll2Dice={turnUIState.value.canRollTwo}
              isRolling={isRolling}
            />
          )}

          {turnUIState.value.kind === "radio-tower-decision" && (
            <>
              <span>You rolled {turnUIState.value.total}</span>
              <StandardButton onClick$={radioTowerRerollAction}>
                Reroll
              </StandardButton>
              <StandardButton onClick$={radioTowerContinueAction}>
                Continue
              </StandardButton>
            </>
          )}

          {(turnUIState.value.kind === "income-red" ||
            turnUIState.value.kind === "income-blue" ||
            turnUIState.value.kind === "income-green" ||
            turnUIState.value.kind === "income-purple") && (
            <IncomeDisplay
              step={
                turnUIState.value.kind.replace("income-", "") as IncomeStep
              }
              transactions={turnUIState.value.transactions}
              playerNames={playerNames}
              onContinue$={advanceIncomeStep}
            />
          )}

          {turnUIState.value.kind === "decision-tv-station" && (
            <TvStationPicker
              opponents={turnUIState.value.opponents}
              playerNames={playerNames}
              onPick$={tvStationAction}
            />
          )}

          {turnUIState.value.kind === "decision-business-center" && (
            <BusinessCenterPicker
              myCards={turnUIState.value.myCards}
              opponents={turnUIState.value.opponents}
              playerNames={playerNames}
              onPick$={businessCenterAction}
            />
          )}

          {turnUIState.value.kind === "buying" && (
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

          {turnUIState.value.kind === "end-turn" && (
            <EndTurn
              code={room.code}
              playerId={me?.id ?? ""}
              isDoubles={turnUIState.value.isDoubles}
            />
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
          <StandardButton
            class="w-auto px-8"
            onClick$={() => marketDialogRef.value?.close()}
          >
            Close
          </StandardButton>
        </div>
      </dialog>
    </>
  );
});
