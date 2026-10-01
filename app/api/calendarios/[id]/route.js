import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../lib/supabaseServer";
import { talvezRegistrarVersao } from "../../../../lib/versionamento";
import { getUsuarioAutenticado, nomeDoUsuario } from "../../../../lib/auth";
import { syncUsuarioProfile } from "../../../../lib/userProfiles";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  const usuario = await getUsuarioAutenticado(request);
  const supabase = getSupabaseServer();

  try {
    const { data: cal, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("*")
      .eq("id", id)
      .single();
    if (error || !cal) throw new Error("Calendário não encontrado");

    // Se o calendário estiver publicado, permite visualização pública
    if (cal.publicado) {
      if (!usuario) {
        return Response.json({ calendario: { ...cal, papel: "visualizador" } });
      }
    }

    if (!usuario) {
      return new Response(JSON.stringify({ error: "Acesso não autorizado." }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const perfil = await syncUsuarioProfile(usuario);
    const eDono = cal.dono_id === usuario.id || cal.dono_email === usuario.email;
    const eSuper = perfil && perfil.e_superusuario;

    if (eDono || eSuper) {
      return Response.json({ calendario: { ...cal, papel: "editor" } });
    }

    // Verificar se há permissão direta por compartilhamento
    const { data: perm } = await supabase
      .from("calendario_permissoes")
      .select("papel")
      .eq("calendario_id", id)
      .eq("email", usuario.email)
      .maybeSingle();

    if (perm) {
      return Response.json({ calendario: { ...cal, papel: perm.papel } });
    }

    // Se não for dono/super/compartilhado mas o calendário é público -> visualizador
    if (cal.publicado) {
      return Response.json({ calendario: { ...cal, papel: "visualizador" } });
    }

    return new Response(JSON.stringify({ error: "Você não tem permissão para acessar este calendário." }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) {
    return new Response(JSON.stringify({ error: "É preciso estar logado para alterar." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, ano, tipo, campus, overrides, marcos, atividades, publicado } = body || {};
    const autorId = usuario.id;
    const autorNome = nomeDoUsuario(usuario);
    const supabase = getSupabaseServer();

    const perfil = await syncUsuarioProfile(usuario);

    const { data: antigo } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!antigo) {
      return new Response(JSON.stringify({ error: "Calendário não encontrado." }), { status: 404 });
    }

    const eDono = antigo.dono_id === usuario.id || antigo.dono_email === usuario.email;
    const eSuper = perfil && perfil.e_superusuario;

    // Verificar se o usuário tem permissão de editor
    let podeEditar = eDono || eSuper;
    if (!podeEditar) {
      const { data: perm } = await supabase
        .from("calendario_permissoes")
        .select("papel")
        .eq("calendario_id", id)
        .eq("email", usuario.email)
        .maybeSingle();
      if (perm && perm.papel === "editor") podeEditar = true;
    }

    if (!podeEditar) {
      return new Response(JSON.stringify({ error: "Um usuário não pode alterar o calendário construído por outro." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    let criouCheckpoint = false;
    if (antigo) {
      criouCheckpoint = await talvezRegistrarVersao(supabase, id, antigo, autorId);
    }

    // Validação de publicação (Requisito 4): somente usuários autorizados ou superusuário podem publicar
    let publicadoFinal = antigo.publicado;
    if (typeof publicado === "boolean") {
      if (eSuper || (perfil && perfil.pode_publicar)) {
        publicadoFinal = publicado;
      } else {
        return new Response(JSON.stringify({ error: "Seu usuário não possui permissão para alterar a publicação do calendário." }), {
          status: 403, headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Requisito 4: Campus vinculado ao usuário (usuário comum mantém o campus do seu cadastro)
    const campusFinal = !eSuper && perfil?.campus ? perfil.campus : (campus !== undefined ? campus : antigo.campus);

    const atualizacao = {
      nome: nome !== undefined ? nome : antigo.nome,
      ano: ano !== undefined ? ano : antigo.ano,
      tipo: tipo !== undefined ? tipo : antigo.tipo,
      campus: campusFinal,
      publicado: publicadoFinal,
      overrides: overrides !== undefined ? overrides : antigo.overrides,
      marcos: marcos !== undefined ? marcos : antigo.marcos,
      atividades: atividades !== undefined ? atividades : antigo.atividades,
      ultimo_autor_id: autorId,
      ultimo_autor_nome: autorNome,
    };
    if (criouCheckpoint) atualizacao.ultima_versao_em = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .update(atualizacao)
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

export async function DELETE(request, { params }) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) {
    return new Response(JSON.stringify({ error: "É preciso estar logado para excluir." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const perfil = await syncUsuarioProfile(usuario);

    const { data: cal } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("dono_id, dono_email")
      .eq("id", id)
      .maybeSingle();

    if (!cal) {
      return Response.json({ ok: true });
    }

    const eDono = cal.dono_id === usuario.id || cal.dono_email === usuario.email;
    const eSuper = perfil && perfil.e_superusuario;

    // Requisito 6: Um usuário não pode apagar o calendário construído por outro
    if (!eDono && !eSuper) {
      return new Response(JSON.stringify({ error: "Você não tem permissão para apagar este calendário." }), {
        status: 403, headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from(TABELA_CALENDARIOS).delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
