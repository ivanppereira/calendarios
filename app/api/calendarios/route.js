import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../lib/supabaseServer";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const supabase = getSupabaseServer();
    const email = usuario.email;

    const { data: permissoes } = await supabase
      .from("calendario_permissoes")
      .select("calendario_id")
      .eq("email", email);

    const idsPermitidos = (permissoes || []).map((p) => p.calendario_id);

    let query = supabase
      .from(TABELA_CALENDARIOS)
      .select("id, nome, ano, tipo, campus, dono_email, updated_at")
      .order("updated_at", { ascending: false });

    if (idsPermitidos.length > 0) {
      query = query.or(`dono_email.eq.${email},dono_id.eq.${usuario.id},id.in.(${idsPermitidos.join(",")}),dono_email.is.null`);
    } else {
      query = query.or(`dono_email.eq.${email},dono_id.eq.${usuario.id},dono_email.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ calendarios: data || [] });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const body = await request.json();
    const { nome, ano, tipo, campus, overrides, marcos, atividades } = body || {};
    if (!nome || !ano || !tipo) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: nome, ano, tipo" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .insert({
        nome, ano, tipo, campus: campus || "",
        dono_id: usuario.id,
        dono_email: usuario.email,
        overrides: overrides || {}, marcos: marcos || {}, atividades: atividades || [],
      })
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
