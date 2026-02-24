import { component$, QRL } from "@qwik.dev/core";

import { ESTABLISHMENTS } from "../../../game/constants";
import type { IncomeStep } from "../../../game/turn-ui-state";
import type { Transaction } from "../../../game/types";
import StandardButton from "../../common/StandardButton";

interface IncomeDisplayProps {
  step: IncomeStep;
  transactions: Transaction[];
  playerNames: Map<string, string>;
  onContinue$: QRL<() => void>;
}

const COLOR_LABELS: Record<IncomeStep, string> = {
  red: "Red Card Payouts",
  blue: "Blue Card Payouts",
  green: "Green Card Payouts",
  purple: "Purple Card Effects",
};

const COLOR_BG: Record<IncomeStep, string> = {
  red: "bg-mk-card-red/20 border-mk-card-red",
  blue: "bg-mk-card-blue/20 border-mk-card-blue",
  green: "bg-mk-card-green/20 border-mk-card-green",
  purple: "bg-mk-card-purple/20 border-mk-card-purple",
};

export default component$<IncomeDisplayProps>(
  ({ step, transactions, playerNames, onContinue$ }) => {
    return (
      <div class="flex w-80 flex-col items-center gap-3">
        <h3 class="text-xl font-bold">{COLOR_LABELS[step]}</h3>
        <div
          class={`w-full rounded-lg border-2 p-4 ${COLOR_BG[step]}`}
        >
          {transactions.length === 0 ? (
            <p class="text-center text-sm opacity-60">No activations</p>
          ) : (
            <ul class="flex flex-col gap-2">
              {transactions.map((tx) => {
                const card = tx.cardId
                  ? ESTABLISHMENTS[tx.cardId]
                  : null;
                const from = tx.fromPlayerId
                  ? playerNames.get(tx.fromPlayerId)
                  : "the bank";
                const to = tx.toPlayerId
                  ? playerNames.get(tx.toPlayerId)
                  : null;
                const key = `${tx.cardId}-${tx.fromPlayerId}-${tx.toPlayerId}`;
                return (
                  <li key={key} class="text-sm">
                    <span class="font-semibold">{card?.name ?? tx.reason}</span>
                    {": "}
                    {to ?? "Someone"} receives {tx.amount} coin
                    {tx.amount === 1 ? "" : "s"} from {from}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <StandardButton onClick$={onContinue$} class="w-auto px-8">
          Continue
        </StandardButton>
      </div>
    );
  },
);
