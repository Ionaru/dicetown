import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/db";
import { gameState, players, rooms } from "../db/schema";
import {
  ESTABLISHMENTS,
  LANDMARKS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  STARTING_CARDS,
  STARTING_COINS,
  applyPendingDecision,
  applyPurchaseEstablishment,
  applyPurchaseLandmark,
  canBuildEstablishment,
  canBuildLandmark,
  canReroll,
  canRollTwoDice,
  createInitialMarketState,
  hasWon,
  resolveRoll,
  shouldTakeExtraTurn,
  type EstablishmentDefinition,
  type EstablishmentId,
  type LandmarkId,
  type PendingDecision,
  type PendingDecisionResolution,
  type PlayerState,
} from "../game";
import { rollDie, rollDice } from "./secure-random";
import { RoomStatus, TurnPhase } from "../utils/enums";
import { SessionContext } from "../auth/session";
import { Q_insertPlayer } from "../db/queries/players";

export type RoomSnapshot = {
  room: {
    id: string;
    code: string;
    status: RoomStatus;
  };
  players: Array<PlayerState & { isAi: boolean; turnOrder: number }>;
  gameState: {
    currentTurnPlayerId: string | null;
    phase: TurnPhase;
    lastDiceRoll: number[] | null;
    marketState: Record<EstablishmentId, number>;
    pendingDecisions: PendingDecision[];
    hasPurchased: boolean;
  } | null;
};

type DbExecutor = Pick<typeof db, "query" | "update">;

export const normalizeRoomCode = (code: string): string =>
  code.trim().toUpperCase();

export const createRoom = async (session: SessionContext['session']): Promise<string> => {
  const code = await generateRoomCode();

  const hostId = session.userId ?? session.anonymousUserId;
  if (!hostId) {
    throw new Error("User not found");
  }

  const room = await db
    .insert(rooms)
    .values({ code, hostId })
    .returning({ id: rooms.id, code: rooms.code });

  const roomId = room[0]?.id;
  if (!roomId) {
    throw new Error("Failed to create room");
  }

  await db.insert(players).values({
    roomId,
    userId: session.userId,
    anonymousUserId: session.anonymousUserId,
    isAi: false,
    turnOrder: 1,
  });

  return code;
};

export const joinRoom = async (session: SessionContext['session'], code: string): Promise<{ code: string; playerId: string }> => {
  const normalizedCode = normalizeRoomCode(code);
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, normalizedCode),
  });

  if (!room) {
    throw new Error("Room not found");
  }
  if (room.status !== "waiting") {
    throw new Error("Room already started");
  }

  const existingPlayers = await db.query.players.findMany({
    where: eq(players.roomId, room.id),
  });
  if (existingPlayers.length >= MAX_PLAYERS) {
    throw new Error("Room is full");
  }

  // Check if the user is already in the room
  const existingPlayer = existingPlayers.find(
    // NULL === NULL
    (player) => {
      if (session.userId) {
        return player.userId === session.userId;
      }
      return player.anonymousUserId === session.anonymousUserId;
    },
  );
  if (existingPlayer) {
    return { code: room.code, playerId: existingPlayer.id };
  }

  const turnOrder = existingPlayers.length + 1;
  const player = await createPlayer({
    roomId: room.id,
    userId: session.userId,
    anonymousUserId: session.anonymousUserId,
    isAi: false,
    turnOrder,
  });

  return { code: room.code, playerId: player.id };
};

export const getRoomSnapshot = async (
  code: string,
): Promise<RoomSnapshot | null> => {
  const normalizedCode = normalizeRoomCode(code);
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.code, normalizedCode),
    with: {
      players: {
        orderBy: [asc(players.turnOrder)],
      },
      gameState: true,
    },
  });

  if (!room) {
    return null;
  }

  const game = room.gameState
    ? {
        currentTurnPlayerId: room.gameState.currentTurnPlayerId ?? null,
        phase: room.gameState.phase,
        lastDiceRoll: room.gameState.lastDiceRoll ?? null,
        marketState: normalizeMarketState(room.gameState.marketState),
        pendingDecisions: normalizePendingDecisions(
          room.gameState.pendingDecisions,
        ),
        hasPurchased: Boolean(room.gameState.hasPurchased),
      }
    : null;

  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status as RoomStatus,
    },
    players: room.players.map(toPlayerState),
    gameState: game,
  };
};

export const startGame = async (code: string): Promise<RoomSnapshot> => {
  const snapshot = await getRoomSnapshot(code);
  if (!snapshot) {
    throw new Error("Room not found");
  }

  if (snapshot.room.status !== "waiting" && snapshot.room.status !== "finished") {
    throw new Error("Game already started");
  }

  if (snapshot.players.length < MIN_PLAYERS) {
    throw new Error(`At least ${MIN_PLAYERS} players are required`);
  }

  const firstPlayerId = snapshot.players.at(0)?.id;
  if (!firstPlayerId) {
    throw new Error("No players found");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(rooms)
      .set({ status: RoomStatus.Playing })
      .where(eq(rooms.id, snapshot.room.id));

    await tx
      .update(players)
      .set({
        coins: STARTING_COINS,
        cards: STARTING_CARDS,
        landmarks: {},
      })
      .where(eq(players.roomId, snapshot.room.id));

    const existingGame = await tx.query.gameState.findFirst({
      where: eq(gameState.roomId, snapshot.room.id),
    });

    if (existingGame) {
      await tx
        .update(gameState)
        .set({
          currentTurnPlayerId: firstPlayerId,
          phase: TurnPhase.Rolling,
          lastDiceRoll: null,
          marketState: createInitialMarketState(),
          pendingDecisions: [],
          hasPurchased: false,
        })
        .where(eq(gameState.roomId, snapshot.room.id));
    } else {
      await tx.insert(gameState).values({
        roomId: snapshot.room.id,
        currentTurnPlayerId: firstPlayerId,
        phase: TurnPhase.Rolling,
        marketState: createInitialMarketState(),
        pendingDecisions: [],
        hasPurchased: false,
      });
    }
  });

  return (await getRoomSnapshot(code)) as RoomSnapshot;
};

export const rollDiceForTurn = async (input: {
  code: string;
  playerId: string;
  diceCount: number;
}): Promise<RoomSnapshot> => {
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.phase !== "rolling") {
    throw new Error("Cannot roll dice in the current phase");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  if (
    snapshot.gameState.lastDiceRoll &&
    snapshot.gameState.pendingDecisions.some(
      (decision) => decision.type === "radio-tower",
    )
  ) {
    throw new Error("Resolve the radio tower decision first");
  }

  if (input.diceCount === 2) {
    const currentPlayer = snapshot.players.find(
      (player) => player.id === input.playerId,
    );
    if (!currentPlayer || !canRollTwoDice(currentPlayer)) {
      throw new Error("Cannot roll two dice");
    }
  }

  const dice = rollDice(input.diceCount);
  const total = dice.reduce((sum, value) => sum + value, 0);

  const currentPlayer = snapshot.players.find(
    (player) => player.id === input.playerId,
  );
  if (currentPlayer && canReroll(currentPlayer)) {
    await db
      .update(gameState)
      .set({
        lastDiceRoll: dice,
        phase: TurnPhase.Rolling,
        pendingDecisions: [{ type: "radio-tower", ownerId: input.playerId }],
        hasPurchased: false,
      })
      .where(eq(gameState.roomId, snapshot.room.id));
    return (await getRoomSnapshot(input.code)) as RoomSnapshot;
  }

  const resolved = resolveRoll({
    roll: total,
    currentPlayerId: input.playerId,
    players: snapshot.players,
  });

  const nextPhase =
    resolved.pendingDecisions.length > 0 ? TurnPhase.Income : TurnPhase.Buying;

  await db.transaction(async (tx) => {
    await persistPlayers(tx, snapshot.room.id, resolved.players);

    await tx
      .update(gameState)
      .set({
        lastDiceRoll: dice,
        phase: nextPhase,
        pendingDecisions: resolved.pendingDecisions,
        hasPurchased: false,
      })
      .where(eq(gameState.roomId, snapshot.room.id));
  });

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

export const resolveDecisionForTurn = async (input: {
  code: string;
  playerId: string;
  decision: PendingDecisionResolution;
}): Promise<RoomSnapshot> => {
  if (input.decision.type === "radio-tower") {
    return await resolveRadioTowerDecisionForTurn({
      code: input.code,
      playerId: input.playerId,
      decision: input.decision,
    });
  }
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  const pending = snapshot.gameState.pendingDecisions;
  const pendingMatch = pending.find(
    (item) =>
      item.type === input.decision.type &&
      item.ownerId === input.decision.ownerId,
  );
  if (!pendingMatch) {
    throw new Error("No pending decision to resolve");
  }

  const resolved = applyPendingDecision(snapshot.players, input.decision);
  const remainingPending = pending.filter(
    (item) =>
      !(item.type === input.decision.type &&
        item.ownerId === input.decision.ownerId),
  );

  const nextPhase = remainingPending.length > 0 ? TurnPhase.Income : TurnPhase.Buying;

  await db.transaction(async (tx) => {
    await persistPlayers(tx, snapshot.room.id, resolved.players);
    await tx
      .update(gameState)
      .set({
        phase: nextPhase,
        pendingDecisions: remainingPending,
      })
      .where(eq(gameState.roomId, snapshot.room.id));
  });

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

const resolveRadioTowerDecisionForTurn = async (input: {
  code: string;
  playerId: string;
  decision: Extract<PendingDecisionResolution, { type: "radio-tower" }>;
}): Promise<RoomSnapshot> => {
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  const pendingMatch = snapshot.gameState.pendingDecisions.find(
    (item) => item.type === "radio-tower" && item.ownerId === input.playerId,
  );
  if (!pendingMatch) {
    throw new Error("No pending decision to resolve");
  }

  const existingRoll = snapshot.gameState.lastDiceRoll;
  if (!existingRoll || existingRoll.length === 0) {
    throw new Error("No roll to resolve");
  }

  const finalDice =
    input.decision.choice === "reroll"
      ? rollDice(existingRoll.length)
      : existingRoll;
  const total = finalDice.reduce((sum, value) => sum + value, 0);

  const resolved = resolveRoll({
    roll: total,
    currentPlayerId: input.playerId,
    players: snapshot.players,
  });

  const nextPhase =
    resolved.pendingDecisions.length > 0 ? TurnPhase.Income : TurnPhase.Buying;

  await db.transaction(async (tx) => {
    await persistPlayers(tx, snapshot.room.id, resolved.players);
    await tx
      .update(gameState)
      .set({
        lastDiceRoll: finalDice,
        phase: nextPhase,
        pendingDecisions: resolved.pendingDecisions,
        hasPurchased: false,
      })
      .where(eq(gameState.roomId, snapshot.room.id));
  });

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

export const buyEstablishmentForTurn = async (input: {
  code: string;
  playerId: string;
  establishmentId: EstablishmentId;
}): Promise<RoomSnapshot> => {
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.phase !== "buying") {
    throw new Error("Cannot buy in the current phase");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  if (snapshot.gameState.hasPurchased) {
    throw new Error("You can only buy one item per turn");
  }

  const player = snapshot.players.find((p) => p.id === input.playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  const establishment =
    ESTABLISHMENTS[input.establishmentId] as EstablishmentDefinition;
  const marketCount = snapshot.gameState.marketState[input.establishmentId] ?? 0;
  const ownedCount = player.cards[input.establishmentId] ?? 0;

  if (marketCount <= 0) {
    throw new Error("That establishment is sold out");
  }
  if (establishment.maxOwned && ownedCount >= establishment.maxOwned) {
    throw new Error("You can only own one of that establishment");
  }
  if (player.coins < establishment.cost) {
    throw new Error("You don't have enough coins");
  }
  if (!canBuildEstablishment(player, input.establishmentId, snapshot.gameState.marketState)) {
    throw new Error("That establishment cannot be purchased right now");
  }

  const { player: updatedPlayer, market } = applyPurchaseEstablishment(
    player,
    input.establishmentId,
    snapshot.gameState.marketState,
  );

  const updatedPlayers = snapshot.players.map((item) =>
    item.id === updatedPlayer.id ? updatedPlayer : item,
  );

  await db.transaction(async (tx) => {
    const updatedGame = await tx
      .update(gameState)
      .set({ marketState: market, hasPurchased: true })
      .where(
        and(
          eq(gameState.roomId, snapshot.room.id),
          eq(gameState.hasPurchased, false),
          eq(gameState.phase, TurnPhase.Buying),
          eq(gameState.currentTurnPlayerId, input.playerId),
        ),
      )
      .returning({ roomId: gameState.roomId });
    if (updatedGame.length === 0) {
      throw new Error("You can only buy one item per turn");
    }
    await persistPlayers(tx, snapshot.room.id, updatedPlayers);
  });

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

export const buyLandmarkForTurn = async (input: {
  code: string;
  playerId: string;
  landmarkId: LandmarkId;
}): Promise<RoomSnapshot> => {
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.phase !== "buying") {
    throw new Error("Cannot buy in the current phase");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  if (snapshot.gameState.hasPurchased) {
    throw new Error("You can only buy one item per turn");
  }

  const player = snapshot.players.find((p) => p.id === input.playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  if (player.landmarks[input.landmarkId]) {
    throw new Error("You already built that landmark");
  }
  if (player.coins < LANDMARKS[input.landmarkId].cost) {
    throw new Error("You don't have enough coins");
  }
  if (!canBuildLandmark(player, input.landmarkId)) {
    throw new Error("That landmark cannot be built right now");
  }

  const updatedPlayer = applyPurchaseLandmark(player, input.landmarkId);
  const updatedPlayers = snapshot.players.map((item) =>
    item.id === updatedPlayer.id ? updatedPlayer : item,
  );

  await db.transaction(async (tx) => {
    const updatedGame = await tx
      .update(gameState)
      .set({ hasPurchased: true })
      .where(
        and(
          eq(gameState.roomId, snapshot.room.id),
          eq(gameState.hasPurchased, false),
          eq(gameState.phase, TurnPhase.Buying),
          eq(gameState.currentTurnPlayerId, input.playerId),
        ),
      )
      .returning({ roomId: gameState.roomId });
    if (updatedGame.length === 0) {
      throw new Error("You can only buy one item per turn");
    }
    await persistPlayers(tx, snapshot.room.id, updatedPlayers);
  });

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

export const endTurn = async (input: {
  code: string;
  playerId: string;
}): Promise<RoomSnapshot> => {
  const snapshot = await endTurnInternal(input);
  return await runAiTurns(snapshot);
};

const generateRoomCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
      ROOM_CODE_ALPHABET[rollDie(ROOM_CODE_ALPHABET.length) - 1],
    ).join("");
    const existing = await db.query.rooms.findFirst({
      where: eq(rooms.code, code),
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Unable to generate unique room code");
};

export const addAiPlayer = async (roomId: string): Promise<void> => {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    with: {
      players:true,
    },
  });
  if (!room) {
    throw new Error("Room not found");
  }

  if (room.status !== "waiting") {
    throw new Error("Room already started");
  }

  if (room.players.length >= MAX_PLAYERS) {
    throw new Error("Room is full");
  }

  const turnOrder = room.players.length + 1;
  await createPlayer({
    roomId,
    userId: null,
    anonymousUserId: null,
    isAi: true,
    turnOrder,
  });
};

export const removeAiPlayer = async (playerId: string): Promise<void> => {
  await db.delete(players).where(eq(players.id, playerId));
};

const createPlayer = async (input: {
  roomId: string;
  userId: string | null;
  anonymousUserId: string | null;
  isAi: boolean;
  turnOrder: number;
}) => {
  const result = await Q_insertPlayer.execute({
    roomId: input.roomId,
    userId: input.userId,
    anonymousUserId: input.anonymousUserId,
    isAi: input.isAi,
    turnOrder: input.turnOrder,
  });

  const player = result[0];
  if (!player) {
    throw new Error("Failed to create player");
  }

  return player;
};

const requireRoomSnapshot = async (code: string): Promise<RoomSnapshot> => {
  const snapshot = await getRoomSnapshot(code);
  if (!snapshot) {
    throw new Error("Room not found");
  }
  return snapshot;
};

const assertPlayerInRoom = (snapshot: RoomSnapshot, playerId: string) => {
  const exists = snapshot.players.some((player) => player.id === playerId);
  if (!exists) {
    throw new Error("Player not in room");
  }
};

const normalizeMarketState = (value: unknown): Record<EstablishmentId, number> =>
  ({ ...createInitialMarketState(), ...(value ?? {}) }) as Record<
    EstablishmentId,
    number
  >;

const normalizePendingDecisions = (value: unknown): PendingDecision[] =>
  (Array.isArray(value) ? value : []) as PendingDecision[];

const toPlayerState = (
  row: typeof players.$inferSelect,
): RoomSnapshot["players"][number] => ({
  id: row.id,
  userId: row.userId,
  anonymousUserId: row.anonymousUserId,
  coins: row.coins,
  cards: (row.cards ?? {}) as Partial<Record<EstablishmentId, number>>,
  landmarks: (row.landmarks ?? {}) as Partial<Record<LandmarkId, boolean>>,
  isAi: row.isAi,
  turnOrder: row.turnOrder,
});

const persistPlayers = async (
  tx: DbExecutor,
  roomId: string,
  updatedPlayers: PlayerState[],
) => {
  const updated = new Map(updatedPlayers.map((player) => [player.id, player]));

  const existing = await tx.query.players.findMany({
    where: eq(players.roomId, roomId),
    orderBy: [asc(players.turnOrder)],
  });

  await Promise.all(
    existing.map((row) => {
      const updatedPlayer = updated.get(row.id);
      if (!updatedPlayer) {
        return Promise.resolve();
      }
      return tx
        .update(players)
        .set({
          coins: updatedPlayer.coins,
          cards: updatedPlayer.cards,
          landmarks: updatedPlayer.landmarks,
        })
        .where(eq(players.id, row.id));
    }),
  );
};

const getNextPlayerId = (playerList: PlayerState[], currentId: string) => {
  const index = playerList.findIndex((player) => player.id === currentId);
  if (index === -1) {
    throw new Error("Current player not found");
  }
  const nextIndex = (index + 1) % playerList.length;
  return playerList[nextIndex].id;
};

const endTurnInternal = async (input: {
  code: string;
  playerId: string;
}): Promise<RoomSnapshot> => {
  const snapshot = await requireRoomSnapshot(input.code);
  assertPlayerInRoom(snapshot, input.playerId);

  if (!snapshot.gameState) {
    throw new Error("Game has not started");
  }

  if (snapshot.gameState.phase !== "buying") {
    throw new Error("Cannot end turn in the current phase");
  }

  if (snapshot.gameState.currentTurnPlayerId !== input.playerId) {
    throw new Error("Not your turn");
  }

  const currentPlayer = snapshot.players.find((p) => p.id === input.playerId);
  if (!currentPlayer) {
    throw new Error("Player not found");
  }

  if (hasWon(currentPlayer)) {
    await db
      .update(rooms)
      .set({ status: RoomStatus.Finished })
      .where(eq(rooms.id, snapshot.room.id));
    return (await getRoomSnapshot(input.code)) as RoomSnapshot;
  }

  const dice = snapshot.gameState.lastDiceRoll ?? [];
  const takeExtraTurn = shouldTakeExtraTurn(currentPlayer, dice);
  const nextPlayerId = takeExtraTurn
    ? currentPlayer.id
    : getNextPlayerId(snapshot.players, currentPlayer.id);

  await db
    .update(gameState)
    .set({
      currentTurnPlayerId: nextPlayerId,
      phase: TurnPhase.Rolling,
      lastDiceRoll: null,
      pendingDecisions: [],
      hasPurchased: false,
    })
    .where(eq(gameState.roomId, snapshot.room.id));

  return (await getRoomSnapshot(input.code)) as RoomSnapshot;
};

const runAiTurns = async (snapshot: RoomSnapshot): Promise<RoomSnapshot> => {
  let currentSnapshot = snapshot;
  let guard = 0;

  while (guard < 20 && currentSnapshot.room.status === "playing") {
    guard += 1;
    const game = currentSnapshot.gameState;
    if (!game) {
      return currentSnapshot;
    }

    const currentPlayer = currentSnapshot.players.find(
      (player) => player.id === game.currentTurnPlayerId,
    );
    if (!currentPlayer || !currentPlayer.isAi) {
      return currentSnapshot;
    }

    const diceCount = canRollTwoDice(currentPlayer) ? 2 : 1;
    currentSnapshot = await rollDiceForTurn({
      code: currentSnapshot.room.code,
      playerId: currentPlayer.id,
      diceCount,
    });

    let pendingDecisions = currentSnapshot.gameState?.pendingDecisions ?? [];
    let decisionGuard = 0;
    while (pendingDecisions.length > 0 && decisionGuard < 10) {
      decisionGuard += 1;
      const decision = pendingDecisions[0];
      if (!decision) {
        break;
      }
      const resolvedDecision = chooseAiDecision(currentSnapshot, decision);
      if (!resolvedDecision) {
        break;
      }
      currentSnapshot = await resolveDecisionForTurn({
        code: currentSnapshot.room.code,
        playerId: currentPlayer.id,
        decision: resolvedDecision,
      });
      pendingDecisions = currentSnapshot.gameState?.pendingDecisions ?? [];
    }

    currentSnapshot = await applyAiPurchase(currentSnapshot, currentPlayer.id);
    currentSnapshot = await endTurnInternal({
      code: currentSnapshot.room.code,
      playerId: currentPlayer.id,
    });
  }

  return currentSnapshot;
};

const applyAiPurchase = async (
  snapshot: RoomSnapshot,
  playerId: string,
): Promise<RoomSnapshot> => {
  if (!snapshot.gameState || snapshot.gameState.phase !== "buying") {
    return snapshot;
  }
  if (snapshot.gameState.hasPurchased) {
    return snapshot;
  }

  const gameState = snapshot.gameState;

  const player = snapshot.players.find((item) => item.id === playerId);
  if (!player) {
    return snapshot;
  }

  const affordableLandmarks = Object.keys(LANDMARKS).filter((landmarkId) =>
    canBuildLandmark(player, landmarkId as LandmarkId)
  );
  if (affordableLandmarks.length > 0) {
    return await buyLandmarkForTurn({
      code: snapshot.room.code,
      playerId,
      landmarkId: affordableLandmarks[0] as LandmarkId,
    });
  }

  const affordableEstablishments = Object.keys(ESTABLISHMENTS).filter(
    (establishmentId) =>
      canBuildEstablishment(
        player,
        establishmentId as EstablishmentId,
        gameState.marketState,
      ),
  );

  if (affordableEstablishments.length === 0) {
    return snapshot;
  }

  return await buyEstablishmentForTurn({
    code: snapshot.room.code,
    playerId,
    establishmentId: affordableEstablishments[0] as EstablishmentId,
  });
};

const chooseAiDecision = (
  snapshot: RoomSnapshot,
  pending: PendingDecision,
): PendingDecisionResolution | null => {
  if (pending.type === "radio-tower") {
    return {
      type: "radio-tower",
      ownerId: pending.ownerId,
      choice: "keep",
    };
  }
  const owner = snapshot.players.find((player) => player.id === pending.ownerId);
  if (!owner) {
    return null;
  }

  const opponents = snapshot.players.filter(
    (player) => player.id !== pending.ownerId,
  );
  if (opponents.length === 0) {
    return null;
  }

  if (pending.type === "tv-station") {
    const target = opponents.reduce((best, player) =>
      player.coins > best.coins ? player : best
    );
    return {
      type: "tv-station",
      ownerId: pending.ownerId,
      targetPlayerId: target.id,
    };
  }

  const ownerCards = getOwnedCards(owner);
  const target = opponents.reduce((best, player) =>
    player.coins > best.coins ? player : best
  );
  const targetCards = getOwnedCards(target);

  if (ownerCards.length === 0 || targetCards.length === 0) {
    return null;
  }

  return {
    type: "business-center",
    ownerId: pending.ownerId,
    targetPlayerId: target.id,
    giveCardId: ownerCards[0],
    takeCardId: targetCards[0],
  };
};

const getOwnedCards = (player: PlayerState): EstablishmentId[] =>
  Object.entries(player.cards)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([cardId]) => cardId as EstablishmentId);
