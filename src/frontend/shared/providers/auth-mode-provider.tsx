"use client";

import React, { createContext, useContext } from "react";

/**
 * Whether this instance has sign-in at all.
 *
 * Client components need to know before touching anything from Clerk: with
 * `AUTH_ENABLED=false` there is no `ClerkProvider` above them, and Clerk's
 * hooks and components throw without one. The value comes from the server (the
 * root layout reads the env), never from a `NEXT_PUBLIC_` variable.
 *
 * Defaults to `false` so a component rendered outside the provider — in a test
 * or a story — takes the path that needs no Clerk.
 */
const AuthModeContext = createContext(false);

export function AuthModeProvider({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthModeContext.Provider value={authEnabled}>
      {children}
    </AuthModeContext.Provider>
  );
}

export const useAuthEnabled = () => useContext(AuthModeContext);
