import { component$ } from "@builder.io/qwik";

export default component$<{ text: string; class?: string }>(
  ({ text: title, class: className }) => (
    <h1 class={`text-6xl font-bold capitalize ${className}`}>{title}</h1>
  ),
);
