import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Link,
  RequestEvent,
  routeAction$,
  useNavigate,
} from "@builder.io/qwik-city";
import { startRegistration as startBrowserRegistration } from "@simplewebauthn/browser";

import { attachUserToSession, getSessionContext } from "../../../auth/session";
import { finishRegistration, startRegistration } from "../../../auth/webauthn";
import Button from "../../../components/common/button";
import { title } from "../../../utils/title";

export const useStartRegistration = routeAction$(async (data, event) => {
  try {
    const userName =
      typeof data.userName === "string" ? data.userName.trim() : "";
    if (!userName) {
      return { ok: false, error: "Username is required." };
    }
    const { session } = await getSessionContext(event);
    if (session.userId) {
      return { ok: false, error: "You are already logged in." };
    }
    const userId = crypto.randomUUID();
    const options = await startRegistration({
      sessionId: session.id,
      userId,
      userName,
      mode: "register",
    });
    return { ok: true, options };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Registration failed.",
    };
  }
});

export const useFinishRegistration = routeAction$(async (data, event) => {
  try {
    const raw = typeof data.responseJson === "string" ? data.responseJson : "";
    if (!raw) {
      return { ok: false, error: "Missing registration response." };
    }
    let response;
    try {
      response = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid registration response." };
    }
    const { session } = await getSessionContext(event);
    const result = await finishRegistration({
      sessionId: session.id,
      response,
    });
    await attachUserToSession(event, session.id, result.userId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Registration failed.",
    };
  }
});

export const onGet = async (event: RequestEvent) => {
  const { session } = await getSessionContext(event);
  if (session.userId) {
    throw event.redirect(302, "/auth/");
  }
};

export default component$(() => {
  const username = useSignal("");
  const errorMessage = useSignal("");
  const successMessage = useSignal("");

  const startRegistrationAction = useStartRegistration();
  const finishRegistrationAction = useFinishRegistration();
  const navigate = useNavigate();

  const handleRegistration = $(async () => {
    errorMessage.value = "";
    successMessage.value = "";
    await startRegistrationAction.submit({ userName: username.value });
    const startResult = startRegistrationAction.value;
    if (!startResult?.ok || !startResult.options) {
      errorMessage.value = startResult?.error ?? "Registration failed.";
      return;
    }
    let registrationResponse;
    try {
      registrationResponse = await startBrowserRegistration({
        optionsJSON: startResult.options,
      });
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Registration cancelled.";
      return;
    }
    await finishRegistrationAction.submit({
      responseJson: JSON.stringify(registrationResponse),
    });
    const finishResult = finishRegistrationAction.value;
    if (!finishResult?.ok) {
      errorMessage.value = finishResult?.error ?? "Registration failed.";
      return;
    }
    successMessage.value = "Account created.";
    navigate("/auth/");
  });

  return (
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <h1 class="text-8xl font-bold">{title}</h1>
      <p class="text-xl">Choose a username to create an account</p>
      <form onsubmit$={handleRegistration} preventdefault:submit>
        <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
          <input
            class="border-mk-blue bg-mk-white w-full rounded-md border px-4 py-2 text-center"
            type="text"
            placeholder="Enter username"
            value={username.value}
            oninput$={(e) =>
              (username.value = (e.target as HTMLInputElement).value)
            }
            required
          />
          <Button type="submit">Create an account</Button>
          <Link class="col-span-2" href="/auth/">
            <Button variant="secondary">Go back</Button>
          </Link>
        </div>
      </form>
      {errorMessage.value && (
        <p class="text-xl text-red-500">{errorMessage.value}</p>
      )}
      {successMessage.value && (
        <p class="text-xl text-green-500">{successMessage.value}</p>
      )}
    </div>
  );
});
