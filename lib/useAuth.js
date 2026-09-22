"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabaseClient";

// `usuario`: undefined enquanto carrega, null se deslogado, objeto do
// Supabase Auth se logado (usuario.email, usuario.user_metadata.full_name, etc.)
export function useAuth() {
  const [usuario, setUsuario] = useState(undefined);
  const [sessao, setSessao] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setUsuario(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session || null);
      setUsuario(data.session?.user || null);
    });
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      setSessao(session || null);
      setUsuario(session?.user || null);
    });
    return () => assinatura.subscription.unsubscribe();
  }, []);

  const entrarComGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setErro("Login não configurado — defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setErro(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setErro(error.message);
  }, []);

  const sair = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const nome = usuario?.user_metadata?.full_name || usuario?.user_metadata?.name || usuario?.email || "";
  const avatarUrl = usuario?.user_metadata?.avatar_url || usuario?.user_metadata?.picture || null;
  const accessToken = sessao?.access_token || null;

  return {
    usuario,
    carregando: usuario === undefined,
    logado: !!usuario,
    nome,
    avatarUrl,
    accessToken,
    erro,
    entrarComGoogle,
    sair,
  };
}
