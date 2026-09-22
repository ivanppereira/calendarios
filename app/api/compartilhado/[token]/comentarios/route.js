import { getSupabaseServer } from "../../../../../lib/supabaseServer";
import { resolverToken, papelPodeComentar } from "../../../../../lib/compartilhamento";
import { getUsuarioAutenticado, respostaNaoAutenticado, nomeDoUsuario } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { token } = await params;
    const resolvido = await resolverToken(token);
    if (!resolvido) {
      return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("calendario_comentarios")
      .select("*")
      .eq("calendario_id", resolvido.calendario.id)
      .order("criado_em", { ascending: true });
    if (error) throw error;
    return Response.json({ comentarios: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { token } = await params;
    const resolvido = await resolverToken(token);
    if (!resolvido) {
      return new Response(JSON.stringify({ error: "Link inválido ou expirado" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    if (!papelPodeComentar(resolvido.papel)) {
      return new Response(JSON.stringify({ error: "Este link é somente leitura — não permite comentar." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json();
    const { texto, dataReferencia } = body || {};
    if (!texto || !texto.trim()) {
      return new Response(JSON.stringify({ error: "O comentário não pode ficar vazio" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("calendario_comentarios")
      .insert({
        calendario_id: resolvido.calendario.id,
        texto: texto.trim(),
        data_referencia: dataReferencia || null,
        autor_id: usuario.id,
        autor_nome: nomeDoUsuario(usuario),
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ comentario: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
