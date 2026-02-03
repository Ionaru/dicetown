import { $, component$, useSignal, useStore, useTask$ } from "@qwik.dev/core";

import {
  runDebouncedTask,
  useDebouncedTaskState,
} from "../../utils/use-debounced-task";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default component$(() => {
  const queue = useStore<string[]>([]);
  const currentItem = useSignal<string | null>(null);
  const taskState = useDebouncedTaskState();

  useTask$(async (ctx) => {
    const q = ctx.track(queue);
    await runDebouncedTask(ctx, taskState, async () => {
      console.log("Task started", q.length);
      try {
        while (q.length > 0) {
          const item = q.shift();
          await sleep(1000);
          if (!item) continue;
          currentItem.value = item;
          console.log("Task processing item", item);
        }
      } finally {
        console.log("Task done");
      }
    });
  }, { deferUpdates: false });

  const pushToQueue = $(() => {
    currentItem.value = null;
    setTimeout(() => { queue.push(crypto.randomUUID()); }, 50);
    setTimeout(() => { queue.push(crypto.randomUUID()); }, 100);
    setTimeout(() => { queue.push(crypto.randomUUID()); }, 150);
    setTimeout(() => { queue.push(crypto.randomUUID()); }, 2000);
  });

  return (
    <>
      <button onClick$={pushToQueue}>Push to queue</button>
      <p>Current item: {currentItem.value}</p>
    </>
  );
});
