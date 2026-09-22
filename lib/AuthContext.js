"use client";

import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext precisa estar dentro de <AuthGate>");
  return ctx;
}
