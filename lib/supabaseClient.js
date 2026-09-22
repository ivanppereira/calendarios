"use client";

import { createClient } from "@supabase/supabase-js";

let cliente = null;
let avisou = false;

// Cliente Supabase para uso no NAVEGADOR — Realtime/Presence (sincronização ao
// vivo) e também o login com Google (Supabase Auth). Usa a chave "anon"
// (pública, feita para rodar no navegador). Nenhuma escrita nos dados do
// calendário passa por aqui — isso continua indo para as rotas em
// app/api/..., que usam a service role key só no servidor e verificam o
// token de login enviado pelo navegador antes de fazer qualquer coisa.
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (!avisou) {
      console.warn(
        "Login e colaboração em tempo real desativados: defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar."
      );
      avisou = true;
    }
    return null;
  }
  if (!cliente) {
    cliente = createClient(url, key, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cliente;
}

