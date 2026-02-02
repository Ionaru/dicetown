import { $, component$, useSignal } from "@qwik.dev/core";
import { Link, routeAction$, routeLoader$ } from "@qwik.dev/router";
import {
  startAuthentication as startBrowserAuthentication,
  startRegistration as startBrowserRegistration,
} from "@simplewebauthn/browser";
import { eq } from "drizzle-orm/pg-core/expressions";

import {
  attachUserToSession,
  getSessionContext,
  logoutToAnonymous,
} from "../../auth/session";
import {
  finishAuthentication,
  finishRegistration,
  startAuthentication,
  startRegistration,
} from "../../auth/webauthn";
import ErrorMessage from "../../components/common/ErrorMessage";
import SmallTitle from "../../components/common/SmallTitle";
import Button from "../../components/common/StandardButton";
import Subtitle from "../../components/common/SubTitle";
import { db } from "../../db/db";
import { users, webauthnCredentials } from "../../db/schema";
import { title } from "../../utils/title";

import { useAnonymousUserName } from "./layout";

export const useAuthState = routeLoader$(async (event) => {
  const { session } = await getSessionContext(event);
  if (!session.userId) {
    return { isLoggedIn: false, displayName: null, credentialCount: 0 };
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  const credentials = await db.query.webauthnCredentials.findMany({
    where: eq(webauthnCredentials.userId, session.userId),
  });
  return {
    isLoggedIn: true,
    userId: session.userId,
    displayName: user?.displayName ?? "Unknown",
    credentialCount: credentials.length,
  };
});

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

export const useStartAuthentication = routeAction$(async (_data, event) => {
  try {
    const { session } = await getSessionContext(event);
    const options = await startAuthentication({ sessionId: session.id });
    return { ok: true, options };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sign-in failed.",
    };
  }
});

export const useFinishAuthentication = routeAction$(async (data, event) => {
  try {
    const raw = typeof data.responseJson === "string" ? data.responseJson : "";
    if (!raw) {
      return { ok: false, error: "Missing authentication response." };
    }
    let response;
    try {
      response = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid authentication response." };
    }
    const { session } = await getSessionContext(event);
    const result = await finishAuthentication({
      sessionId: session.id,
      response,
    });
    await attachUserToSession(event, session.id, result.userId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sign-in failed.",
    };
  }
});

export const useStartAddPasskey = routeAction$(async (_data, event) => {
  try {
    const { session } = await getSessionContext(event);
    if (!session.userId) {
      return { ok: false, error: "You must be logged in." };
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    const options = await startRegistration({
      sessionId: session.id,
      userId: session.userId,
      userName: user?.displayName ?? "Unknown",
      mode: "add",
    });
    return { ok: true, options };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to add passkey.",
    };
  }
});

export const useFinishAddPasskey = routeAction$(async (data, event) => {
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
    if (!session.userId) {
      return { ok: false, error: "You must be logged in." };
    }
    const result = await finishRegistration({
      sessionId: session.id,
      response,
    });
    if (result.userId !== session.userId) {
      return { ok: false, error: "Passkey belongs to a different user." };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to add passkey.",
    };
  }
});

export const useLogout = routeAction$(async (_data, event) => {
  try {
    const { session } = await getSessionContext(event);
    await logoutToAnonymous(event, session.id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Logout failed.",
    };
  }
});

export default component$(() => {
  const authState = useAuthState().value;
  const errorMessage = useSignal("");
  const successMessage = useSignal("");

  const anonymousUserName = useAnonymousUserName().value;
  const startAuthenticationAction = useStartAuthentication();
  const finishAuthenticationAction = useFinishAuthentication();
  const startAddPasskeyAction = useStartAddPasskey();
  const finishAddPasskeyAction = useFinishAddPasskey();
  const logoutAction = useLogout();

  const handleAuthentication = $(async () => {
    errorMessage.value = "";
    successMessage.value = "";
    await startAuthenticationAction.submit({});
    const startResult = startAuthenticationAction.value;
    if (!startResult?.ok || !startResult.options) {
      errorMessage.value = startResult?.error ?? "Sign-in failed.";
      return;
    }
    let authenticationResponse;
    try {
      authenticationResponse = await startBrowserAuthentication({
        optionsJSON: startResult.options,
      });
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Sign-in cancelled.";
      return;
    }
    await finishAuthenticationAction.submit({
      responseJson: JSON.stringify(authenticationResponse),
    });
    const finishResult = finishAuthenticationAction.value;
    if (!finishResult?.ok) {
      errorMessage.value = finishResult?.error ?? "Sign-in failed.";
      return;
    }
    successMessage.value = "Signed in.";
    globalThis.location.reload();
  });

  const handleAddPasskey = $(async () => {
    errorMessage.value = "";
    successMessage.value = "";
    await startAddPasskeyAction.submit({});
    const startResult = startAddPasskeyAction.value;
    if (!startResult?.ok || !startResult.options) {
      errorMessage.value = startResult?.error ?? "Unable to add passkey.";
      return;
    }
    let registrationResponse;
    try {
      registrationResponse = await startBrowserRegistration({
        optionsJSON: startResult.options,
      });
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Passkey creation cancelled.";
      return;
    }
    await finishAddPasskeyAction.submit({
      responseJson: JSON.stringify(registrationResponse),
    });
    const finishResult = finishAddPasskeyAction.value;
    if (!finishResult?.ok) {
      errorMessage.value = finishResult?.error ?? "Unable to add passkey.";
      return;
    }
    successMessage.value = "Passkey added.";
    globalThis.location.reload();
  });

  const handleLogout = $(async () => {
    errorMessage.value = "";
    successMessage.value = "";
    await logoutAction.submit({});
    const result = logoutAction.value;
    if (!result?.ok) {
      errorMessage.value = "Logout failed.";
      return;
    }
    successMessage.value = "Logged out.";
    globalThis.location.reload();
  });

  return (
    <div class="flex h-full flex-col items-center justify-center gap-4 select-none">
      <Subtitle text={`Welcome to ${title}`} />
      <SmallTitle text={`👤 ${anonymousUserName.name}`} />
      {authState.isLoggedIn ? (
        <>
          <Subtitle text="Here you can add a passkey or log out" />
          <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
            <Button onClick$={handleAddPasskey}>Add passkey</Button>
            <Button onClick$={handleLogout}>Log out</Button>
            {errorMessage.value && (
              <ErrorMessage message={errorMessage.value} />
            )}
            <Link class="col-span-2" href="/">
              <Button variant="secondary">Go back</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <Subtitle text="Here you can log in or create an account" />
          <div class="grid w-100 grid-cols-2 items-center justify-center gap-4">
            <Button onClick$={handleAuthentication}>Log in</Button>
            <Link href="/auth/create/">
              <Button>Create an account</Button>
            </Link>
            {errorMessage.value && (
              <ErrorMessage message={errorMessage.value} />
            )}
            <Link class="col-span-2" href="/">
              <Button variant="secondary">Go back</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
});
