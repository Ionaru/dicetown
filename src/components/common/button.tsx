import { component$, QRL, Slot } from "@builder.io/qwik";

interface ButtonProps {
  onClick$?: QRL<() => void>;
}

export default component$<ButtonProps>((props) => {
  return (
    <button
      class="bg-mk-blue text-white px-4 py-2 rounded-md font-junegull"
      onClick$={() => props.onClick$?.()}
    >
      <Slot />
    </button>
  );
});
