import {
  DEFAULT_MARKET_COUNTS,
  ESTABLISHMENTS,
  LANDMARKS,
  STARTING_CARDS,
  STARTING_COINS,
  type CardEffect,
  type CardIcon,
  type EstablishmentDefinition,
  type EstablishmentId,
  type LandmarkId,
} from "./constants";
import type {
  BusinessCenterDecision,
  MarketState,
  PendingDecision,
  PendingDecisionResolution,
  PlayerId,
  PlayerState,
  RollResolution,
  Transaction,
  TvStationDecision,
} from "./types";

type ResolveRollInput = {
  roll: number;
  currentPlayerId: PlayerId;
  players: PlayerState[];
  decisions?: PendingDecisionResolution[];
};

export const createInitialMarketState = (): MarketState => ({
  ...DEFAULT_MARKET_COUNTS,
});

export const createInitialPlayerState = (
  id: PlayerId,
  userId: string | null,
  anonymousUserId: string | null,
): PlayerState => ({
  id,
  userId,
  anonymousUserId,
  coins: STARTING_COINS,
  cards: { ...STARTING_CARDS },
  landmarks: {},
});

export const canRollTwoDice = (player: PlayerState): boolean =>
  Boolean(player.landmarks["train-station"]);

export const shouldTakeExtraTurn = (
  player: PlayerState,
  dice: number[],
): boolean =>
  Boolean(player.landmarks["amusement-park"]) &&
  dice.length === 2 &&
  dice[0] === dice[1];

export const canReroll = (player: PlayerState): boolean =>
  Boolean(player.landmarks["radio-tower"]);

export const resolveRoll = (input: ResolveRollInput): RollResolution => {
  const { roll, currentPlayerId, players, decisions = [] } = input;
  const state = createWorkingState(players);
  const activePlayer = getPlayer(state, currentPlayerId);
  const transactions: Transaction[] = [];
  const log: string[] = [];
  const pendingDecisions: PendingDecision[] = [];

  applyRedCards(state, activePlayer.id, roll, transactions, log);
  applyBlueCards(state, roll, transactions, log);
  applyGreenCards(state, activePlayer.id, roll, transactions, log);
  applyPurpleCards(
    state,
    activePlayer.id,
    roll,
    decisions,
    transactions,
    log,
    pendingDecisions,
  );

  return {
    players: Array.from(state.players.values()),
    transactions,
    log,
    pendingDecisions,
  };
};

export const applyPendingDecision = (
  players: PlayerState[],
  decision: PendingDecisionResolution,
): RollResolution => {
  const state = createWorkingState(players);
  const transactions: Transaction[] = [];
  const log: string[] = [];

  if (decision.type === "radio-tower") {
    return {
      players,
      transactions,
      log,
      pendingDecisions: [],
    };
  }

  if (decision.type === "tv-station") {
    applyTvStationDecision(state, decision, transactions, log);
  } else {
    applyBusinessCenterDecision(state, decision, transactions, log);
  }

  return {
    players: Array.from(state.players.values()),
    transactions,
    log,
    pendingDecisions: [],
  };
};

export const canBuildEstablishment = (
  player: PlayerState,
  establishmentId: EstablishmentId,
  market: MarketState,
): boolean => {
  const establishment = ESTABLISHMENTS[
    establishmentId
  ] as EstablishmentDefinition;
  if (!establishment) {
    return false;
  }

  const remaining = market[establishmentId] ?? 0;
  const owned = getCardCount(player, establishmentId);

  if (remaining <= 0) {
    return false;
  }

  if (establishment.maxOwned && owned >= establishment.maxOwned) {
    return false;
  }

  return player.coins >= establishment.cost;
};

export const applyPurchaseEstablishment = (
  player: PlayerState,
  establishmentId: EstablishmentId,
  market: MarketState,
): { player: PlayerState; market: MarketState } => {
  if (!canBuildEstablishment(player, establishmentId, market)) {
    throw new Error("Establishment purchase not allowed");
  }

  const establishment = ESTABLISHMENTS[establishmentId];
  const updatedPlayer = {
    ...player,
    coins: player.coins - establishment.cost,
    cards: {
      ...player.cards,
      [establishmentId]: getCardCount(player, establishmentId) + 1,
    },
  };

  return {
    player: updatedPlayer,
    market: {
      ...market,
      [establishmentId]: (market[establishmentId] ?? 0) - 1,
    },
  };
};

export const canBuildLandmark = (
  player: PlayerState,
  landmarkId: LandmarkId,
): boolean => {
  const landmark = LANDMARKS[landmarkId];
  if (!landmark) {
    return false;
  }

  if (player.landmarks[landmarkId]) {
    return false;
  }

  return player.coins >= landmark.cost;
};

export const applyPurchaseLandmark = (
  player: PlayerState,
  landmarkId: LandmarkId,
): PlayerState => {
  if (!canBuildLandmark(player, landmarkId)) {
    throw new Error("Landmark purchase not allowed");
  }

  return {
    ...player,
    coins: player.coins - LANDMARKS[landmarkId].cost,
    landmarks: { ...player.landmarks, [landmarkId]: true },
  };
};

export const hasWon = (player: PlayerState): boolean =>
  (Object.keys(LANDMARKS) as LandmarkId[]).every((id) => player.landmarks[id]);

const createWorkingState = (players: PlayerState[]) => ({
  players: new Map(
    players.map((player) => [
      player.id,
      {
        ...player,
        cards: { ...player.cards },
        landmarks: { ...player.landmarks },
      },
    ]),
  ),
});

const getPlayer = (
  state: { players: Map<PlayerId, PlayerState> },
  id: PlayerId,
) => {
  const player = state.players.get(id);
  if (!player) {
    throw new Error(`Player not found: ${id}`);
  }
  return player;
};

const getCardCount = (
  player: PlayerState,
  establishmentId: EstablishmentId,
): number => player.cards[establishmentId] ?? 0;

const rollMatchesCard = (
  roll: number,
  establishment: EstablishmentDefinition,
): boolean => establishment.activation.includes(roll);

const shoppingMallBonus = (
  player: PlayerState,
  establishment: EstablishmentDefinition,
): number => {
  if (!player.landmarks["shopping-mall"]) {
    return 0;
  }

  if (establishment.icon === "bread" || establishment.icon === "cup") {
    return 1;
  }

  return 0;
};

const applyRedCards = (
  state: { players: Map<PlayerId, PlayerState> },
  activePlayerId: PlayerId,
  roll: number,
  transactions: Transaction[],
  log: string[],
) => {
  for (const player of state.players.values()) {
    if (player.id === activePlayerId) {
      continue;
    }

    for (const [cardId, count] of Object.entries(player.cards)) {
      const establishment = ESTABLISHMENTS[cardId as EstablishmentId];
      if (establishment?.color !== "red") {
        continue;
      }
      if (!rollMatchesCard(roll, establishment)) {
        continue;
      }

      const bonus = shoppingMallBonus(player, establishment);
      const payout = getEffectPayout(
        establishment.effect,
        player,
        count,
        bonus,
      );

      if (payout <= 0) {
        continue;
      }

      const paid = transferCoins(state, activePlayerId, player.id, payout);
      if (paid > 0) {
        transactions.push({
          fromPlayerId: activePlayerId,
          toPlayerId: player.id,
          amount: paid,
          reason: `${establishment.name} activation`,
          cardId: establishment.id as EstablishmentId,
        });
        log.push(
          `${player.id} receives ${paid} coin(s) from ${establishment.name}.`,
        );
      }
    }
  }
};

const applyBlueCards = (
  state: { players: Map<PlayerId, PlayerState> },
  roll: number,
  transactions: Transaction[],
  log: string[],
) => {
  for (const player of state.players.values()) {
    applyBankPayouts(player, roll, "blue", transactions, log);
  }
};

const applyGreenCards = (
  state: { players: Map<PlayerId, PlayerState> },
  activePlayerId: PlayerId,
  roll: number,
  transactions: Transaction[],
  log: string[],
) => {
  const activePlayer = getPlayer(state, activePlayerId);
  applyBankPayouts(activePlayer, roll, "green", transactions, log);
};

const applyPurpleCards = (
  state: { players: Map<PlayerId, PlayerState> },
  activePlayerId: PlayerId,
  roll: number,
  decisions: PendingDecisionResolution[],
  transactions: Transaction[],
  log: string[],
  pendingDecisions: PendingDecision[],
) => {
  const activePlayer = getPlayer(state, activePlayerId);

  for (const [cardId, count] of Object.entries(activePlayer.cards)) {
    const establishment = ESTABLISHMENTS[cardId as EstablishmentId];
    if (establishment?.color !== "purple") {
      continue;
    }
    if (!rollMatchesCard(roll, establishment)) {
      continue;
    }

    if (count <= 0) {
      continue;
    }

    const effect = establishment.effect;
    if (effect.kind === "stealEach") {
      applyStadium(state, activePlayer.id, establishment, transactions, log);
      continue;
    }

    if (effect.kind === "stealChoice") {
      const decision = decisions.find(
        (item): item is TvStationDecision =>
          item.type === "tv-station" && item.ownerId === activePlayer.id,
      );
      if (!decision) {
        pendingDecisions.push({ type: "tv-station", ownerId: activePlayer.id });
        continue;
      }
      applyTvStationDecision(state, decision, transactions, log);
      continue;
    }

    if (effect.kind === "swap") {
      const decision = decisions.find(
        (item): item is BusinessCenterDecision =>
          item.type === "business-center" && item.ownerId === activePlayer.id,
      );
      if (!decision) {
        pendingDecisions.push({
          type: "business-center",
          ownerId: activePlayer.id,
        });
        continue;
      }
      applyBusinessCenterDecision(state, decision, transactions, log);
    }
  }
};

const applyBankPayouts = (
  player: PlayerState,
  roll: number,
  color: "blue" | "green",
  transactions: Transaction[],
  log: string[],
) => {
  for (const [cardId, count] of Object.entries(player.cards)) {
    const establishment = ESTABLISHMENTS[cardId as EstablishmentId];
    if (establishment?.color !== color) {
      continue;
    }
    if (!rollMatchesCard(roll, establishment)) {
      continue;
    }

    const bonus = shoppingMallBonus(player, establishment);
    const payout = getEffectPayout(establishment.effect, player, count, bonus);
    if (payout <= 0) {
      continue;
    }

    addCoins(player, payout);
    transactions.push({
      toPlayerId: player.id,
      amount: payout,
      reason: `${establishment.name} activation`,
      cardId: establishment.id as EstablishmentId,
    });
    log.push(`${player.id} gains ${payout} coin(s) from the bank.`);
  }
};

const getEffectPayout = (
  effect: CardEffect,
  player: PlayerState,
  count: number,
  bonus: number,
): number => {
  if (effect.kind === "bank" || effect.kind === "steal") {
    return count * (effect.amount + bonus);
  }

  if (effect.kind === "bankPerIcon") {
    const iconCount = countCardsByIcons(player, effect.icons);
    return count * effect.amount * iconCount;
  }

  return 0;
};

const applyStadium = (
  state: { players: Map<PlayerId, PlayerState> },
  activePlayerId: PlayerId,
  establishment: EstablishmentDefinition,
  transactions: Transaction[],
  log: string[],
) => {
  for (const player of state.players.values()) {
    if (player.id === activePlayerId) {
      continue;
    }

    const paid = transferCoins(
      state,
      player.id,
      activePlayerId,
      establishment.effect.kind === "stealEach"
        ? establishment.effect.amount
        : 0,
    );
    if (paid > 0) {
      transactions.push({
        fromPlayerId: player.id,
        toPlayerId: activePlayerId,
        amount: paid,
        reason: `${establishment.name} activation`,
        cardId: establishment.id as EstablishmentId,
      });
      log.push(
        `${getPlayer(state, activePlayerId).id} receives ${paid} coin(s) from ${player.id}.`,
      );
    }
  }
};

const applyTvStationDecision = (
  state: { players: Map<PlayerId, PlayerState> },
  decision: TvStationDecision,
  transactions: Transaction[],
  log: string[],
) => {
  const owner = getPlayer(state, decision.ownerId);
  const target = getPlayer(state, decision.targetPlayerId);
  const establishment = ESTABLISHMENTS["tv-station"];

  const amount =
    establishment.effect.kind === "stealChoice"
      ? establishment.effect.amount
      : 0;
  const paid = transferCoins(state, target.id, owner.id, amount);

  if (paid > 0) {
    transactions.push({
      fromPlayerId: target.id,
      toPlayerId: owner.id,
      amount: paid,
      reason: `${establishment.name} activation`,
      cardId: establishment.id as EstablishmentId,
    });
    log.push(`${owner.id} takes ${paid} coin(s) from ${target.id}.`);
  }
};

const applyBusinessCenterDecision = (
  state: { players: Map<PlayerId, PlayerState> },
  decision: BusinessCenterDecision,
  transactions: Transaction[],
  log: string[],
) => {
  const owner = getPlayer(state, decision.ownerId);
  const target = getPlayer(state, decision.targetPlayerId);
  const ownerCount = getCardCount(owner, decision.giveCardId);
  const targetCount = getCardCount(target, decision.takeCardId);

  if (ownerCount <= 0 || targetCount <= 0) {
    throw new Error("Business Center swap not allowed");
  }

  owner.cards[decision.giveCardId] = ownerCount - 1;
  owner.cards[decision.takeCardId] =
    getCardCount(owner, decision.takeCardId) + 1;
  target.cards[decision.takeCardId] = targetCount - 1;
  target.cards[decision.giveCardId] =
    getCardCount(target, decision.giveCardId) + 1;

  transactions.push({
    fromPlayerId: owner.id,
    toPlayerId: target.id,
    amount: 0,
    reason: "Business Center swap",
    cardId: "business-center",
  });
  log.push(
    `${owner.id} swaps ${ESTABLISHMENTS[decision.giveCardId].name} with ${target.id}'s ${ESTABLISHMENTS[decision.takeCardId].name}.`,
  );
};

const addCoins = (player: PlayerState, amount: number) => {
  if (amount <= 0) {
    return;
  }
  player.coins += amount;
};

const transferCoins = (
  state: { players: Map<PlayerId, PlayerState> },
  fromPlayerId: PlayerId,
  toPlayerId: PlayerId,
  amount: number,
): number => {
  if (fromPlayerId === toPlayerId || amount <= 0) {
    return 0;
  }

  const from = getPlayer(state, fromPlayerId);
  const to = getPlayer(state, toPlayerId);
  const paid = Math.min(from.coins, amount);

  if (paid <= 0) {
    return 0;
  }

  from.coins -= paid;
  to.coins += paid;
  return paid;
};

const countCardsByIcons = (player: PlayerState, icons: CardIcon[]): number => {
  let total = 0;
  for (const [cardId, count] of Object.entries(player.cards)) {
    const establishment = ESTABLISHMENTS[cardId as EstablishmentId];
    if (!establishment) {
      continue;
    }
    if (icons.includes(establishment.icon)) {
      total += count ?? 0;
    }
  }
  return total;
};
