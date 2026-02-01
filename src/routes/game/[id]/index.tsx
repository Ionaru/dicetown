import DiceBox from "@3d-dice/dice-box-threejs";
import {
  $,
  component$,
  useContextProvider,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, routeLoader$, server$ } from "@builder.io/qwik-city";

import SmallTitle from "../../../components/common/SmallTitle";
import StandardButton from "../../../components/common/StandardButton";
import SubTitle from "../../../components/common/SubTitle";
import { DiceBoxContext } from "../../../context/dice-box";
import { getRoomSnapshot } from "../../../server/game-service";
import { rollDice } from "../../../server/secure-random";

export const useGame = routeLoader$(async ({ params }) => {
  const snapshot = await getRoomSnapshot(params.id);
  console.log("snapshot", snapshot);
  return {
    snapshot,
  };
});

export const serverRollDice = server$((amount = 1) => rollDice(amount, 6));

export default component$(() => {
  const diceBox = useSignal<DiceBox | null>(null);
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

  const { snapshot } = useGame().value;
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
  const gameState = snapshot.gameState;

  if (!gameState) {
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

  const rollDiceAction = $(async () => {
    const amount = 1;
    const result = await serverRollDice(amount);
    console.log("result", result);
    if (!diceBox.value) return;
    diceBox.value.onRollComplete = (result) => {
      console.log("roll complete", result);
      diceBox.value?.clearDice();
    };
    diceBox.value.roll(`${amount}d6@${result}`);
  });

  const me = players.find((player) => player.id === gameState.currentTurnPlayerId);
  const currentTurnPlayer = players.find((player) => player.id === gameState.currentTurnPlayerId);
  const isMyTurn = currentTurnPlayer?.id === me?.id;

  return (
    <div>
      <h1>Game {snapshot?.room.code}</h1>
      <ul>
        {Object.entries(me?.cards ?? {}).map(([card, count]) => (
          <li key={card}>{card} x {count}</li>
        ))}
      </ul>
      <StandardButton onClick$={rollDiceAction}>
        Roll Dice
      </StandardButton>
    </div>
  );
});
