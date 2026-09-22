import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../lib/supabaseServer";
import { resolverToken, papelPodeEditar } from "../../../../lib/compartilhamento";
import { talvezRegistrarVersao } from "../../../../lib/versionamento";
import { getUsuarioAutenticado, respostaNaoAutenticado, nomeDoUsuario } from "../../../../lib/auth";

export const runtime = "nodejs";

function semId(calendario, papel) {
  const { id, token_editor, token_comentador, token_visualizador, ...resto } = calendario;
  return { ...resto, papel };
}

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
    return Response.json({ calendario: semId(resolvido.calendario, resolvido.papel) });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request, { params }) {
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
    if (!papelPodeEditar(resolvido.papel)) {
      return new Response(JSON.stringify({ error: "Este link é somente leitura ou de comentários — não permite editar o calendário." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { nome, ano, tipo, campus, overrides, marcos, atividades } = body || {};
    const autorId = usuario.id;
    const autorNome = nomeDoUsuario(usuario);
    const supabase = getSupabaseServer();
    const id = resolvido.calendario.id;

    const antigo = {
      nome: resolvido.calendario.nome, ano: resolvido.calendario.ano, tipo: resolvido.calendario.tipo,
      campus: resolvido.calendario.campus, overrides: resolvido.calendario.overrides,
      marcos: resolvido.calendario.marcos, atividades: resolvido.calendario.atividades,
      ultimo_autor_id: resolvido.calendario.ultimo_autor_id,
      ultimo_autor_nome: resolvido.calendario.ultimo_autor_nome,
      ultima_versao_em: resolvido.calendario.ultima_versao_em,
    };
    const criouCheckpoint = await talvezRegistrarVersao(supabase, id, antigo, autorId);

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
    return Response.json({ calendario: semId(data, resolvido.papel) });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
