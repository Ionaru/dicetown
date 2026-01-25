import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section>
      <p>Game Layout</p>
      <Slot />
    </section>
  );
});
