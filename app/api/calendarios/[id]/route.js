import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../lib/supabaseServer";
import { talvezRegistrarVersao } from "../../../../lib/versionamento";
import { getUsuarioAutenticado, respostaNaoAutenticado, nomeDoUsuario } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return Response.json({ calendario: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, ano, tipo, campus, overrides, marcos, atividades } = body || {};
    const autorId = usuario.id;
    const autorNome = nomeDoUsuario(usuario);
    const supabase = getSupabaseServer();

    const { data: antigo } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("nome, ano, tipo, campus, overrides, marcos, atividades, ultimo_autor_id, ultimo_autor_nome, ultima_versao_em")
      .eq("id", id)
      .maybeSingle();

    let criouCheckpoint = false;
    if (antigo) {
      criouCheckpoint = await talvezRegistrarVersao(supabase, id, antigo, autorId);
    }

    const atualizacao = {
      nome, ano, tipo, campus: campus || "",
      overrides: overrides || {}, marcos: marcos || {}, atividades: atividades || [],
      ultimo_autor_id: autorId,
      ultimo_autor_nome: autorNome,
    };
    if (criouCheckpoint) atualizacao.ultima_versao_em = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .update(atualizacao)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json({ calendario: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { error } = await supabase.from(TABELA_CALENDARIOS).delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
