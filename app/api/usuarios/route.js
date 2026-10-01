import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../lib/auth";
import { syncUsuarioProfile, listarTodosUsuarios, atualizarPerfilUsuario } from "../../../lib/userProfiles";

export const runtime = "nodejs";

export async function GET(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const perfil = await syncUsuarioProfile(usuario);
    if (!perfil || !perfil.e_superusuario) {
      return new Response(JSON.stringify({ error: "Acesso permitido apenas para superusuários." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }
    const usuarios = await listarTodosUsuarios();
    return Response.json({ usuarios });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const perfil = await syncUsuarioProfile(usuario);
    if (!perfil || !perfil.e_superusuario) {
      return new Response(JSON.stringify({ error: "Acesso permitido apenas para superusuários." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }
    const body = await request.json();
    const { id, campus, pode_criar, pode_publicar, e_superusuario } = body || {};
    if (!id) {
      return new Response(JSON.stringify({ error: "ID de usuário não informado." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    const atualizado = await atualizarPerfilUsuario(id, { campus, pode_criar, pode_publicar, e_superusuario });
    return Response.json({ usuario: atualizado });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
