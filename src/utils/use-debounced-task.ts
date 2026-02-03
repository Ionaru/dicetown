import type { Signal, TaskCtx } from "@qwik.dev/core";
import { useSignal } from "@qwik.dev/core";

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
  ctx: TaskCtx,
  state: DebouncedTaskState,
  run: () => Promise<void> | void,
) => {
  ctx.track(() => state.runToken.value);

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
