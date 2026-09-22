import { getSupabaseServer } from "../../../../../lib/supabaseServer";
import { resolverToken, clonarCalendario } from "../../../../../lib/compartilhamento";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../../../lib/auth";

export const runtime = "nodejs";

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
    const supabase = getSupabaseServer();
    const clone = await clonarCalendario(supabase, resolvido.calendario);
    return Response.json({ calendario: clone });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
