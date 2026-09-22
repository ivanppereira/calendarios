import { getSupabaseServer } from "../../../../../lib/supabaseServer";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const autorId = searchParams.get("autor_id");

    const supabase = getSupabaseServer();
    let query = supabase
      .from("calendario_versoes")
      .select("id, autor_id, autor_nome, motivo, criado_em")
      .eq("calendario_id", id)
      .order("criado_em", { ascending: false });
    if (autorId) query = query.eq("autor_id", autorId);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ versoes: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
