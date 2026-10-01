import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../lib/supabaseServer";
import { getUsuarioAutenticado, respostaNaoAutenticado } from "../../../lib/auth";
import { syncUsuarioProfile } from "../../../lib/userProfiles";

export const runtime = "nodejs";

export async function GET(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) return respostaNaoAutenticado();
  try {
    const perfil = await syncUsuarioProfile(usuario);
    const supabase = getSupabaseServer();
    const email = usuario.email;

    if (perfil && perfil.e_superusuario) {
      // Superusuário tem acesso a todos os calendários do sistema
      const { data, error } = await supabase
        .from(TABELA_CALENDARIOS)
        .select("id, nome, ano, tipo, campus, dono_email, dono_id, publicado, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return Response.json({ calendarios: data || [], perfil });
    }

    // Usuário comum: apenas os calendários criados por ele ou compartilhados com ele
    const { data: permissoes } = await supabase
      .from("calendario_permissoes")
      .select("calendario_id")
      .eq("email", email);

    const idsPermitidos = (permissoes || []).map((p) => p.calendario_id);

    let query = supabase
      .from(TABELA_CALENDARIOS)
      .select("id, nome, ano, tipo, campus, dono_email, dono_id, publicado, updated_at")
      .order("updated_at", { ascending: false });

    if (idsPermitidos.length > 0) {
      query = query.or(`dono_email.eq.${email},dono_id.eq.${usuario.id},id.in.(${idsPermitidos.join(",")})`);
    } else {
      query = query.or(`dono_email.eq.${email},dono_id.eq.${usuario.id}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ calendarios: data || [], perfil });
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
    const perfil = await syncUsuarioProfile(usuario);
    if (perfil && !perfil.pode_criar && !perfil.e_superusuario) {
      return new Response(JSON.stringify({ error: "Seu usuário não possui permissão para criar calendários." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { nome, ano, tipo, campus, overrides, marcos, atividades } = body || {};
    if (!nome || !ano || !tipo) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: nome, ano, tipo" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    // Requisito 4: Usuário comum só pode criar calendários para seu próprio campus
    const campusFinal = (perfil && !perfil.e_superusuario) ? (perfil.campus || "Pouso Alegre") : (campus || perfil?.campus || "Pouso Alegre");

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .insert({
        nome, ano, tipo, campus: campusFinal,
        dono_id: usuario.id,
        dono_email: usuario.email,
        publicado: false,
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
