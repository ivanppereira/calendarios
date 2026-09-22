import { getSupabaseServer, TABELA_CALENDARIOS } from "./supabaseServer";

// Dado um token de compartilhamento, descobre a que calendário ele pertence e
// qual papel (editor/comentador/visualizador) ele concede. Retorna null se o
// token não corresponder a nenhum calendário. O id do calendário NUNCA deve
// ser devolvido ao navegador quando o acesso veio por token — só usamos aqui,
// no servidor, para buscar/gravar os dados.
export async function resolverToken(token) {
  const supabase = getSupabaseServer();
  const colunas = [
    ["token_editor", "editor"],
    ["token_comentador", "comentador"],
    ["token_visualizador", "visualizador"],
  ];
  for (const [coluna, papel] of colunas) {
    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("*")
      .eq(coluna, token)
      .maybeSingle();
    if (!error && data) {
      return { calendario: data, papel };
    }
  }
  return null;
}

export function papelPodeEditar(papel) {
  return papel === "editor";
}

export function papelPodeComentar(papel) {
  return papel === "editor" || papel === "comentador";
}

export async function clonarCalendario(supabase, original, sobrescrever = {}) {
  const novoNome = sobrescrever.nome || `${original.nome} (cópia)`;
  const { data: clone, error } = await supabase
    .from(TABELA_CALENDARIOS)
    .insert({
      nome: novoNome,
      ano: sobrescrever.ano || original.ano,
      tipo: original.tipo,
      campus: original.campus,
      overrides: original.overrides,
      marcos: original.marcos,
      atividades: original.atividades,
    })
    .select()
    .single();
  if (error) throw error;
  return clone;
}
