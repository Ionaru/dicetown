import { useSignal, Signal } from "@qwik.dev/core";
import { Tracker } from "@qwik.dev/core/internal";

export type DebouncedTaskState = {
  isProcessing: Signal<boolean>;
  hasPendingRun: Signal<boolean>;
  runToken: Signal<number>;
};

export const useDebouncedTaskState = (): DebouncedTaskState => ({
  isProcessing: useSignal(false),
  hasPendingRun: useSignal(false),
  runToken: useSignal(0),
});

export const runDebouncedTask = async (
  track: Tracker,
  state: DebouncedTaskState,
  run: () => Promise<void> | void,
) => {
  track(() => state.runToken.value);

  if (state.isProcessing.value) {
    state.hasPendingRun.value = true;
    return;
  }

  state.isProcessing.value = true;
  try {
    await run();
  } finally {
    state.isProcessing.value = false;
    if (state.hasPendingRun.value) {
      state.hasPendingRun.value = false;
      state.runToken.value++;
    }
  }
};
