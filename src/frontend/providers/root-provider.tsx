"use client";

import React from "react";

import { AuthModeProvider } from "./auth-mode-provider";
import { QueryProvider } from "./query-provider";

export function RootProvider({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthModeProvider authEnabled={authEnabled}>
      <QueryProvider>{children}</QueryProvider>
    </AuthModeProvider>
  );
}
