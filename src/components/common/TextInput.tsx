import { component$, Signal } from "@builder.io/qwik";

export default component$<{
  value: Signal<string>;
  placeholder?: string;
  required?: boolean;
}>(({ value, placeholder = "Enter room code", required = false }) => (
  <input
    class="border-mk-blue bg-mk-white w-full rounded-md border px-4 py-2 text-center"
    type="text"
    placeholder={placeholder}
    value={value.value}
    oninput$={(e) => (value.value = (e.target as HTMLInputElement).value)}
    required={required}
  />
));
