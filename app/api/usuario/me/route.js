import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../../lib/auth";
import { syncUsuarioProfile } from "../../../../lib/userProfiles";

export const runtime = "nodejs";

export async function GET(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const perfil = await syncUsuarioProfile(usuario);
    return Response.json({ perfil });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
