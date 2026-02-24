import {
  ESTABLISHMENTS,
  type CardColor,
  type EstablishmentId,
} from "./constants";
import type { PendingDecision, PlayerState, Transaction } from "./types";

export type TurnUIState =
  | { kind: "not-my-turn" }
  | { kind: "roll-dice"; canRollTwo: boolean }
  | { kind: "dice-rolling" }
  | {
      kind: "radio-tower-decision";
      dice: number[];
      total: number;
    }
  | { kind: "income-red"; transactions: Transaction[] }
  | { kind: "income-blue"; transactions: Transaction[] }
  | { kind: "income-green"; transactions: Transaction[] }
  | { kind: "income-purple"; transactions: Transaction[] }
  | {
      kind: "decision-tv-station";
      opponents: PlayerState[];
    }
  | {
      kind: "decision-business-center";
      myCards: EstablishmentId[];
      opponents: { player: PlayerState; cards: EstablishmentId[] }[];
    }
  | { kind: "buying" }
  | { kind: "end-turn"; isDoubles: boolean };

const INCOME_STEP_ORDER = ["red", "blue", "green", "purple"] as const;

export type IncomeStep = (typeof INCOME_STEP_ORDER)[number];

export type GroupedTransactions = Partial<
  Record<CardColor, Transaction[]>
>;

export function groupTransactionsByColor(
  transactions: Transaction[],
): GroupedTransactions {
  const groups: GroupedTransactions = {};
  for (const tx of transactions) {
    if (!tx.cardId) continue;
    const establishment = ESTABLISHMENTS[tx.cardId];
    if (!establishment) continue;
    const color = establishment.color;
    groups[color] ??= [];
    groups[color].push(tx);
  }
  return groups;
}

export function getIncomeSteps(
  grouped: GroupedTransactions,
): IncomeStep[] {
  return INCOME_STEP_ORDER.filter(
    (color) => (grouped[color]?.length ?? 0) > 0,
  );
}

export function getNextIncomeStep(
  steps: IncomeStep[],
  current: IncomeStep | null,
): IncomeStep | null {
  if (current === null) return steps[0] ?? null;
  const idx = steps.indexOf(current);
  return steps[idx + 1] ?? null;
}

type GameStateView = {
  currentTurnPlayerId: string | null;
  phase: string;
  lastDiceRoll: number[] | null;
  lastRollTransactions: Transaction[];
  pendingDecisions: PendingDecision[];
  hasPurchased: boolean;
};

export type DeriveInput = {
  gameState: GameStateView;
  myPlayerId: string;
  myPlayer: PlayerState;
  players: PlayerState[];
  isRolling: boolean;
  incomeStep: IncomeStep | null;
};

/**
 * Pure derivation of the current UI state from server + local state.
 * During the income animation sequence `incomeStep` is set externally
 * by the queue processor; outside of that it should be null.
 */
export function deriveTurnUIState(input: DeriveInput): TurnUIState {
  const { gameState, myPlayerId, myPlayer, players, isRolling, incomeStep } =
    input;

  // Income is shown for ALL players, regardless of whose turn it is.
  if (incomeStep !== null) {
    return deriveIncomeState(gameState, incomeStep);
  }

  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  if (!isMyTurn) return { kind: "not-my-turn" };

  if (isRolling) return { kind: "dice-rolling" };

  switch (gameState.phase) {
    case "rolling":
      return deriveRollingState(gameState, myPlayerId, myPlayer);
    case "income":
      return derivePendingDecisionState(gameState, myPlayerId, myPlayer, players);
    case "buying":
      return deriveBuyingState(gameState, myPlayer);
    default:
      return { kind: "not-my-turn" };
  }
}

function deriveIncomeState(
  gameState: GameStateView,
  incomeStep: IncomeStep,
): TurnUIState {
  const grouped = groupTransactionsByColor(gameState.lastRollTransactions);
  const txns = grouped[incomeStep] ?? [];
  return {
    kind: `income-${incomeStep}`,
    transactions: txns,
  } as TurnUIState;
}

function deriveRollingState(
  gameState: GameStateView,
  myPlayerId: string,
  myPlayer: PlayerState,
): TurnUIState {
  const hasRadioTower = gameState.pendingDecisions.some(
    (d) => d.type === "radio-tower" && d.ownerId === myPlayerId,
  );
  if (hasRadioTower && gameState.lastDiceRoll) {
    return {
      kind: "radio-tower-decision",
      dice: gameState.lastDiceRoll,
      total: gameState.lastDiceRoll.reduce((a, b) => a + b, 0),
    };
  }
  return {
    kind: "roll-dice",
    canRollTwo: Boolean(myPlayer.landmarks["train-station"]),
  };
}

function derivePendingDecisionState(
  gameState: GameStateView,
  myPlayerId: string,
  myPlayer: PlayerState,
  players: PlayerState[],
): TurnUIState {
  const tvStation = gameState.pendingDecisions.find(
    (d) => d.type === "tv-station" && d.ownerId === myPlayerId,
  );
  if (tvStation) {
    return {
      kind: "decision-tv-station",
      opponents: players.filter((p) => p.id !== myPlayerId),
    };
  }

  const businessCenter = gameState.pendingDecisions.find(
    (d) => d.type === "business-center" && d.ownerId === myPlayerId,
  );
  if (businessCenter) {
    return {
      kind: "decision-business-center",
      myCards: getOwnedNonPurpleCards(myPlayer),
      opponents: players
        .filter((p) => p.id !== myPlayerId)
        .map((p) => ({ player: p, cards: getOwnedNonPurpleCards(p) })),
    };
  }

  return { kind: "not-my-turn" };
}

function deriveBuyingState(
  gameState: GameStateView,
  myPlayer: PlayerState,
): TurnUIState {
  if (gameState.hasPurchased) {
    const dice = gameState.lastDiceRoll ?? [];
    const isDoubles =
      dice.length === 2 &&
      dice[0] === dice[1] &&
      Boolean(myPlayer.landmarks["amusement-park"]);
    return { kind: "end-turn", isDoubles };
  }
  return { kind: "buying" };
}

function getOwnedNonPurpleCards(player: PlayerState): EstablishmentId[] {
  return (
    Object.entries(player.cards) as [EstablishmentId, number | undefined][]
  )
    .filter(([cardId, count]) => {
      if ((count ?? 0) <= 0) return false;
      const est = ESTABLISHMENTS[cardId];
      return est && est.color !== "purple";
    })
    .map(([cardId]) => cardId);
}
