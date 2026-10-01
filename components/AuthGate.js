"use client";

import { useAuth } from "../lib/useAuth";
import { AuthContext } from "../lib/AuthContext";

export default function AuthGate({ children }) {
  const auth = useAuth();

  if (auth.carregando) {
    return (
      <div className="tela-central">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
