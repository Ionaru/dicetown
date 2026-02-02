import type { EstablishmentId, LandmarkId } from "./constants";

export type PlayerId = string;

export type PlayerState = {
  id: PlayerId;
  userId: string | null;
  anonymousUserId: string | null;
  coins: number;
  cards: Partial<Record<EstablishmentId, number>>;
  landmarks: Partial<Record<LandmarkId, boolean>>;
};

export type MarketState = Record<EstablishmentId, number>;

export type TurnPhase = "rolling" | "income" | "buying" | "cleanup";

export type Transaction = {
  fromPlayerId?: PlayerId;
  toPlayerId?: PlayerId;
  amount: number;
  reason: string;
  cardId?: EstablishmentId;
};

export type PendingDecision =
  | {
      type: "tv-station";
      ownerId: PlayerId;
    }
  | {
      type: "business-center";
      ownerId: PlayerId;
    }
  | {
      type: "radio-tower";
      ownerId: PlayerId;
    };

export type RollResolution = {
  players: PlayerState[];
  transactions: Transaction[];
  log: string[];
  pendingDecisions: PendingDecision[];
};

export type TvStationDecision = {
  type: "tv-station";
  ownerId: PlayerId;
  targetPlayerId: PlayerId;
};

export type BusinessCenterDecision = {
  type: "business-center";
  ownerId: PlayerId;
  targetPlayerId: PlayerId;
  giveCardId: EstablishmentId;
  takeCardId: EstablishmentId;
};

export type RadioTowerDecision = {
  type: "radio-tower";
  ownerId: PlayerId;
  choice: "keep" | "reroll";
};

export type PendingDecisionResolution =
  | TvStationDecision
  | BusinessCenterDecision
  | RadioTowerDecision;
