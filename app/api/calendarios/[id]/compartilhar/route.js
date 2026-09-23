import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../../lib/supabaseServer";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../../../lib/auth";

export const runtime = "nodejs";

// Auxiliar para verificar se o usuário é dono ou editor do calendário
async function verificarDonoOuEditor(supabase, calendarioId, usuario) {
  const { data: cal } = await supabase
    .from(TABELA_CALENDARIOS)
    .select("dono_id, dono_email")
    .eq("id", calendarioId)
    .maybeSingle();

  if (!cal) return false;
  if (!cal.dono_email || cal.dono_email === usuario.email || cal.dono_id === usuario.id) {
    return true;
  }

  const { data: perm } = await supabase
    .from("calendario_permissoes")
    .select("papel")
    .eq("calendario_id", calendarioId)
    .eq("email", usuario.email)
    .maybeSingle();

  return perm && perm.papel === "editor";
}

export async function GET(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();

  const { id } = await params;
  try {
    const supabase = getSupabaseServer();
    const { data: cal } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("dono_email")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("calendario_permissoes")
      .select("id, email, papel, criado_em")
      .eq("calendario_id", id)
      .order("criado_em", { ascending: true });

    if (error) throw error;
    return Response.json({ dono_email: cal?.dono_email || null, permissoes: data || [] });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();

  const { id } = await params;
  try {
    const body = await request.json();
    const { email, papel } = body || {};
    if (!email || !papel) {
      return new Response(JSON.stringify({ error: "E-mail e papel são obrigatórios." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseServer();
    const autorizado = await verificarDonoOuEditor(supabase, id, usuario);
    if (!autorizado) {
      return new Response(JSON.stringify({ error: "Apenas o proprietário ou editores podem compartilhar este calendário." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("calendario_permissoes")
      .upsert({ calendario_id: id, email: email.toLowerCase().trim(), papel }, { onConflict: "calendario_id,email" })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ permissao: data });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();

  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseServer();
    const autorizado = await verificarDonoOuEditor(supabase, id, usuario);
    if (!autorizado) {
      return new Response(JSON.stringify({ error: "Sem permissão para remover acesso." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("calendario_permissoes")
      .delete()
      .eq("calendario_id", id)
      .eq("email", email.toLowerCase().trim());

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
