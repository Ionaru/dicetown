import DiceBox from "@3d-dice/dice-box-threejs";
import {
  $,
  component$,
  useContextProvider,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Link, routeLoader$, server$ } from "@qwik.dev/router";

import { getSessionContext } from "../../../auth/session";
import { supabase } from "../../../client/supabase";
import SmallTitle from "../../../components/common/SmallTitle";
import StandardButton from "../../../components/common/StandardButton";
import SubTitle from "../../../components/common/SubTitle";
import { DiceBoxContext } from "../../../context/dice-box";
import { gameState } from "../../../db/schema";
import { mapRowToTable } from "../../../db/utils";
import {
  buyEstablishmentForTurn,
  endTurn,
  getRoomSnapshot,
  rollDiceForTurn,
} from "../../../server/game-service";

const doDiceRoll = (diceBox: DiceBox, result: number[]) =>
  new Promise<void>((resolve) => {
    if (!diceBox) return;
    diceBox.onRollComplete = () => {
      diceBox?.clearDice();
      resolve();
    };
    diceBox.roll(`${result.length}d6@${result.join(",")}`);
  });

export const useGame = routeLoader$(({ params }) => getRoomSnapshot(params.id));

export const usePlayer = routeLoader$(async (requestEvent) => {
  const { session } = await getSessionContext(requestEvent);
  const snapshot = await requestEvent.resolveValue(useGame);
  return snapshot?.players.find(
    (player) =>
      (session.userId && player.userId === session.userId) ||
      player.anonymousUserId === session.anonymousUserId,
  );
});

const rollDice$ = server$((code, playerId, diceCount = 1) =>
  rollDiceForTurn({ code, playerId, diceCount }),
);
const buyEstablishmnent$ = server$((code, playerId, establishmentId) =>
  buyEstablishmentForTurn({ code, playerId, establishmentId }),
);
const endTurn$ = server$((code, playerId) => endTurn({ code, playerId }));

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
  const updateQueue = useStore<(typeof gameState.$inferSelect)[]>([]);
  const snapshot = useGame().value;
  const me = usePlayer().value;

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
  const players = snapshot.players;
  const gameSnapshot = useStore(snapshot);

  /**
   * This task is responsible for updating the UI and handling UI events based on the game state.
   * For example, showing a dice roll animation and visualizing the purchase of an establishment.
   */
  useTask$(async ({ track }) => {
    const queue = track(updateQueue);
    if (queue.length > 0) {
      const updatedGameState = queue.at(0);
      if (!updatedGameState) return;
      if (
        updatedGameState.phase === "buying" &&
        !updatedGameState.hasPurchased
      ) {
        if (!diceBox.value) return;
        await doDiceRoll(diceBox.value, updatedGameState.lastDiceRoll ?? []);
      }
      gameSnapshot.gameState = updatedGameState;
      queue.shift();
    }
  });

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

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    const updateChannel = supabase
      .channel(`game_state-update:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newState = mapRowToTable(gameState, payload.new);
          updateQueue.push(newState);
        },
      )
      .subscribe();

    cleanup(() => {
      updateChannel.unsubscribe();
    });
  });

  const currentTurnPlayer = players.find(
    (player) => player.id === gameSnapshot.gameState?.currentTurnPlayerId,
  );
  const isMyTurn = currentTurnPlayer?.id === me?.id;

  const rollDiceAction = $(() => rollDice$(room.code, me?.id, 1));
  const buyEstablishmentAction = $(() =>
    buyEstablishmnent$(room.code, me?.id, "business-center"),
  );
  const endTurnAction = $(() => endTurn$(room.code, me?.id));

  return (
    <div>
      <pre>isMyTurn: {isMyTurn ? "true" : "false"}</pre>
      <h1>Game {gameSnapshot.room.code}</h1>
      <p>Coins: {me?.coins}</p>
      <ul>
        {Object.entries(me?.cards ?? {}).map(([card, count]) => (
          <li key={card}>
            {card} x {count}
          </li>
        ))}
      </ul>
      {isMyTurn && gameSnapshot.gameState?.phase === "rolling" && (
        <StandardButton onClick$={rollDiceAction}>Roll Dice</StandardButton>
      )}
      {isMyTurn && gameSnapshot.gameState?.phase === "buying" && (
        <>
          <StandardButton onClick$={buyEstablishmentAction}>
            Buy Establishment
          </StandardButton>
          <StandardButton onClick$={endTurnAction}>End turn</StandardButton>
        </>
      )}
    </div>
  );
});
