import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../../../lib/supabaseServer";
import { registrarVersaoRestauracao } from "../../../../../../lib/versionamento";
import { getUsuarioAutenticado, respostaNaoAutenticado, nomeDoUsuario } from "../../../../../../lib/auth";

export const runtime = "nodejs";

// Restaura o calendário para o estado gravado nesta versão. O estado atual
// (antes da restauração) é preservado como uma nova entrada no histórico, com
// motivo "restauracao", para que a restauração em si também possa ser desfeita.
export async function POST(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id, versaoId } = await params;
    const autorId = usuario.id;
    const autorNome = nomeDoUsuario(usuario);

    const supabase = getSupabaseServer();

    const { data: versao, error: erroVersao } = await supabase
      .from("calendario_versoes")
      .select("*")
      .eq("id", versaoId)
      .eq("calendario_id", id)
      .single();
    if (erroVersao) throw erroVersao;

    const { data: atual } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("nome, ano, tipo, campus, overrides, marcos, atividades")
      .eq("id", id)
      .maybeSingle();
    if (atual) {
      await registrarVersaoRestauracao(supabase, id, atual, autorId, autorNome);
    }

    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .update({
        nome: versao.nome, ano: versao.ano, tipo: versao.tipo, campus: versao.campus,
        overrides: versao.overrides || {}, marcos: versao.marcos || {}, atividades: versao.atividades || [],
      })
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
