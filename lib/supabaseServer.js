import { createClient } from "@supabase/supabase-js";

let cliente = null;

// Cliente Supabase para uso EXCLUSIVO em rotas de API (server-side). Usa a
// service role key, que nunca deve ser exposta ao navegador — por isso não tem
// prefixo NEXT_PUBLIC_. Todo o acesso ao banco passa pelas rotas em app/api/calendarios,
// então o app funciona mesmo com Row Level Security habilitado e sem nenhuma policy
// pública, já que a service role sempre contorna a RLS.
export function getSupabaseServer() {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina as variáveis de ambiente SUPABASE_URL e " +
      "SUPABASE_SERVICE_ROLE_KEY (veja o README para instruções)."
    );
  }
  cliente = createClient(url, key, { auth: { persistSession: false } });
  return cliente;
}

export const TABELA_CALENDARIOS = "calendarios";
