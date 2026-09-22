import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../../lib/supabaseServer";
import { clonarCalendario } from "../../../../../lib/compartilhamento";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { data: original, error: erroLeitura } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("*")
      .eq("id", id)
      .single();
    if (erroLeitura) throw erroLeitura;

    let sobrescrever = {};
    try {
      const body = await request.json();
      if (body?.nome) sobrescrever.nome = body.nome;
      if (body?.ano) sobrescrever.ano = body.ano;
    } catch {
      // corpo vazio é aceitável — usa os padrões
    }

    const clone = await clonarCalendario(supabase, original, sobrescrever);
    return Response.json({ calendario: clone });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
