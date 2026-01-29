import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm/pg-core/expressions";

import { db } from "../db/db";
import { users, webauthnCredentials } from "../db/schema";

import { origin, rpID, rpName } from "./config";
import { getSessionFromId, mergeSessionData } from "./session";

type WebAuthnRegistrationState = {
  challenge: string;
  userId: string;
  userName: string;
  mode: "register" | "add";
};

type WebAuthnAuthenticationState = {
  challenge: string;
};

const toBase64Url = (value: Uint8Array) =>
  Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url");

const getRegistrationState = (
  sessionData: unknown,
): WebAuthnRegistrationState | null => {
  if (!sessionData || typeof sessionData !== "object") {
    return null;
  }
  const data = sessionData as Record<string, unknown>;
  const registration = data.webauthnRegistration as WebAuthnRegistrationState;
  if (!registration?.challenge || !registration?.userId) {
    return null;
  }
  return registration;
};

const getAuthenticationState = (
  sessionData: unknown,
): WebAuthnAuthenticationState | null => {
  if (!sessionData || typeof sessionData !== "object") {
    return null;
  }
  const data = sessionData as Record<string, unknown>;
  const authentication =
    data.webauthnAuthentication as WebAuthnAuthenticationState;
  if (!authentication?.challenge) {
    return null;
  }
  return authentication;
};

export const startRegistration = async (input: {
  sessionId: string;
  userId: string;
  userName: string;
  mode: "register" | "add";
}) => {
  const existingCredentials = await db.query.webauthnCredentials.findMany({
    where: eq(webauthnCredentials.userId, input.userId),
  });
  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: Buffer.from(input.userId),
    userName: input.userName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credentialId,
    })),
  });

  await mergeSessionData(input.sessionId, {
    webauthnRegistration: {
      challenge: options.challenge,
      userId: input.userId,
      userName: input.userName,
      mode: input.mode,
    } satisfies WebAuthnRegistrationState,
  });

  return options;
};

export const finishRegistration = async (input: {
  sessionId: string;
  response: RegistrationResponseJSON;
}) => {
  const session = await getSessionFromId(input.sessionId);
  const registration = getRegistrationState(session?.data);
  if (!registration) {
    throw new Error("Missing registration challenge");
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: registration.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  if (registration.mode === "register") {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, registration.userId),
    });
    if (!existing) {
      await db
        .insert(users)
        .values({
          id: registration.userId,
          displayName: registration.userName,
        })
        .returning();
    }
  }

  const { registrationInfo } = verification;
  const credentialId = registrationInfo.credential.id;
  const credentialPublicKey = toBase64Url(
    registrationInfo.credential.publicKey,
  );

  await db.insert(webauthnCredentials).values({
    userId: registration.userId,
    credentialId,
    credentialPublicKey,
    counter: registrationInfo.credential.counter,
    transports: registrationInfo.credential.transports ?? null,
    backupEligible: registrationInfo.credentialDeviceType === "multiDevice",
    backupState: registrationInfo.credentialBackedUp,
  });

  await mergeSessionData(input.sessionId, {
    webauthnRegistration: null,
  });

  return { userId: registration.userId };
};

export const startAuthentication = async (input: { sessionId: string }) => {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  await mergeSessionData(input.sessionId, {
    webauthnAuthentication: { challenge: options.challenge },
  });

  return options;
};

export const finishAuthentication = async (input: {
  sessionId: string;
  response: AuthenticationResponseJSON;
}) => {
  const session = await getSessionFromId(input.sessionId);
  const authentication = getAuthenticationState(session?.data);
  if (!authentication) {
    throw new Error("Missing authentication challenge");
  }

  const credential = await db.query.webauthnCredentials.findFirst({
    where: eq(webauthnCredentials.credentialId, input.response.id),
  });
  if (!credential) {
    throw new Error("An account with this passkey was not found");
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: authentication.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: fromBase64Url(credential.credentialPublicKey),
      counter: credential.counter,
    },
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.authenticationInfo) {
    throw new Error("Authentication verification failed");
  }

  await db
    .update(webauthnCredentials)
    .set({
      counter: verification.authenticationInfo.newCounter,
      updatedAt: new Date(),
    })
    .where(eq(webauthnCredentials.credentialId, credential.credentialId));

  await mergeSessionData(input.sessionId, {
    webauthnAuthentication: null,
  });

  return { userId: credential.userId };
};
