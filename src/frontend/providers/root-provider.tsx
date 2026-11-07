"use client";

import React from "react";

import { AuthModeProvider } from "./auth-mode-provider";

export function RootProvider({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthModeProvider authEnabled={authEnabled}>{children}</AuthModeProvider>
  );
}
