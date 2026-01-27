import { component$, QRL, Slot } from "@builder.io/qwik";

interface ButtonProps {
  onClick$?: QRL<() => void> | null;
  variant?: "primary" | "secondary";
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
}

export default component$<ButtonProps>(
  ({
    variant = "primary",
    onClick$ = null,
    isLoading = false,
    type = "button",
  }) => {
    let classes =
      variant === "primary"
        ? "bg-mk-blue text-white hover:bg-mk-blue/80"
        : "bg-mk-white text-mk-blue hover:bg-mk-white/80";
    if (isLoading) {
      classes += " opacity-50 pointer-events-none";
    }
    return (
      <button
        class={`${classes} font-junegull w-full cursor-pointer rounded-md px-4 py-2 transition hover:scale-105`}
        onclick$={isLoading ? null : onClick$}
        type={type}
      >
        <Slot />
        {isLoading && <span class="inline-block animate-spin">⚙️</span>}
      </button>
    );
  },
);
