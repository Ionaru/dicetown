export type CardColor = "blue" | "green" | "red" | "purple";
export type CardIcon =
  | "wheat"
  | "cow"
  | "bread"
  | "cup"
  | "gear"
  | "factory"
  | "fruit";

export type CardEffect =
  | { kind: "bank"; amount: number }
  | { kind: "steal"; amount: number }
  | { kind: "stealEach"; amount: number }
  | { kind: "bankPerIcon"; amount: number; icons: CardIcon[] }
  | { kind: "stealChoice"; amount: number }
  | { kind: "swap" };

export type EstablishmentDefinition = {
  id: string;
  name: string;
  color: CardColor;
  cost: number;
  activation: number[];
  icon: CardIcon;
  effect: CardEffect;
  maxOwned?: number;
};

export type LandmarkDefinition = {
  id: string;
  name: string;
  cost: number;
  description: string;
};

export const ESTABLISHMENTS = {
  "wheat-field": {
    id: "wheat-field",
    name: "Wheat Field",
    color: "blue",
    cost: 1,
    activation: [1],
    icon: "wheat",
    effect: { kind: "bank", amount: 1 },
  },
  ranch: {
    id: "ranch",
    name: "Ranch",
    color: "blue",
    cost: 1,
    activation: [2],
    icon: "cow",
    effect: { kind: "bank", amount: 1 },
  },
  bakery: {
    id: "bakery",
    name: "Bakery",
    color: "green",
    cost: 1,
    activation: [2, 3],
    icon: "bread",
    effect: { kind: "bank", amount: 1 },
  },
  cafe: {
    id: "cafe",
    name: "Cafe",
    color: "red",
    cost: 2,
    activation: [3],
    icon: "cup",
    effect: { kind: "steal", amount: 1 },
  },
  "convenience-store": {
    id: "convenience-store",
    name: "Convenience Store",
    color: "green",
    cost: 2,
    activation: [4],
    icon: "bread",
    effect: { kind: "bank", amount: 3 },
  },
  forest: {
    id: "forest",
    name: "Forest",
    color: "blue",
    cost: 3,
    activation: [5],
    icon: "gear",
    effect: { kind: "bank", amount: 1 },
  },
  stadium: {
    id: "stadium",
    name: "Stadium",
    color: "purple",
    cost: 6,
    activation: [6],
    icon: "factory",
    effect: { kind: "stealEach", amount: 2 },
    maxOwned: 1,
  },
  "tv-station": {
    id: "tv-station",
    name: "TV Station",
    color: "purple",
    cost: 7,
    activation: [6],
    icon: "factory",
    effect: { kind: "stealChoice", amount: 5 },
    maxOwned: 1,
  },
  "business-center": {
    id: "business-center",
    name: "Business Center",
    color: "purple",
    cost: 8,
    activation: [6],
    icon: "factory",
    effect: { kind: "swap" },
    maxOwned: 1,
  },
  "cheese-factory": {
    id: "cheese-factory",
    name: "Cheese Factory",
    color: "green",
    cost: 5,
    activation: [7],
    icon: "factory",
    effect: { kind: "bankPerIcon", amount: 3, icons: ["cow"] },
  },
  "furniture-factory": {
    id: "furniture-factory",
    name: "Furniture Factory",
    color: "green",
    cost: 3,
    activation: [8],
    icon: "factory",
    effect: { kind: "bankPerIcon", amount: 3, icons: ["gear"] },
  },
  mine: {
    id: "mine",
    name: "Mine",
    color: "blue",
    cost: 6,
    activation: [9],
    icon: "gear",
    effect: { kind: "bank", amount: 5 },
  },
  "family-restaurant": {
    id: "family-restaurant",
    name: "Family Restaurant",
    color: "red",
    cost: 3,
    activation: [9, 10],
    icon: "cup",
    effect: { kind: "steal", amount: 2 },
  },
  "apple-orchard": {
    id: "apple-orchard",
    name: "Apple Orchard",
    color: "blue",
    cost: 3,
    activation: [10],
    icon: "fruit",
    effect: { kind: "bank", amount: 3 },
  },
  "fruit-and-vegetable-market": {
    id: "fruit-and-vegetable-market",
    name: "Fruit and Vegetable Market",
    color: "green",
    cost: 2,
    activation: [11, 12],
    icon: "fruit",
    effect: { kind: "bankPerIcon", amount: 2, icons: ["wheat", "fruit"] },
  },
} satisfies Record<string, EstablishmentDefinition>;

export type EstablishmentId = keyof typeof ESTABLISHMENTS;

export const LANDMARKS = {
  "train-station": {
    id: "train-station",
    name: "Train Station",
    cost: 4,
    description: "You may roll 2 dice.",
  },
  "shopping-mall": {
    id: "shopping-mall",
    name: "Shopping Mall",
    cost: 10,
    description:
      "Your bread and cup establishments earn +1 coin (bank or players).",
  },
  "amusement-park": {
    id: "amusement-park",
    name: "Amusement Park",
    cost: 16,
    description: "If you roll doubles, take another turn.",
  },
  "radio-tower": {
    id: "radio-tower",
    name: "Radio Tower",
    cost: 22,
    description: "Once per turn, you may re-roll your dice.",
  },
} satisfies Record<string, LandmarkDefinition>;

export type LandmarkId = keyof typeof LANDMARKS;

export const DEFAULT_MARKET_COUNTS: Record<EstablishmentId, number> = {
  "wheat-field": 6,
  ranch: 6,
  bakery: 6,
  cafe: 6,
  "convenience-store": 6,
  forest: 6,
  stadium: 4,
  "tv-station": 4,
  "business-center": 4,
  "cheese-factory": 6,
  "furniture-factory": 6,
  mine: 6,
  "family-restaurant": 6,
  "apple-orchard": 6,
  "fruit-and-vegetable-market": 6,
};

export const STARTING_COINS = 3;
export const STARTING_CARDS: Partial<Record<EstablishmentId, number>> = {
  "wheat-field": 1,
  bakery: 1,
};

export const MAX_PLAYERS = 5;
export const MIN_PLAYERS = 2;
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
