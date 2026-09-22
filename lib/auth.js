import { getSupabaseServer } from "./supabaseServer";

// Verifica o token de login (enviado pelo navegador via apiFetch) contra o
// Supabase Auth. Retorna o usuário autenticado (com .id, .email,
// .user_metadata.full_name/avatar_url) ou null se não houver login válido.
// Toda rota de API que mexe com dados de calendário chama isso primeiro.
export async function getUsuarioAutenticado(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export function nomeDoUsuario(usuario) {
  return usuario?.user_metadata?.full_name || usuario?.user_metadata?.name || usuario?.email || "Anônimo";
}

export function respostaNaoAutenticado() {
  return new Response(JSON.stringify({ error: "É preciso entrar com o Google para continuar." }), {
    status: 401, headers: { "Content-Type": "application/json" },
  });
}
