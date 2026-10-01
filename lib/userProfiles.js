import { getSupabaseServer } from "./supabaseServer";
import { nomeDoUsuario } from "./auth";

/**
 * Garante que a tabela 'usuarios' existe no Supabase.
 */
async function garantirTabelaUsuarios(supabase) {
  try {
    await supabase.rpc("exec_sql", {
      sql_query: `
        create table if not exists usuarios (
          id text primary key,
          email text unique not null,
          nome text,
          avatar_url text,
          campus text default 'Pouso Alegre',
          pode_criar boolean not null default true,
          pode_publicar boolean not null default true,
          e_superusuario boolean not null default false,
          criado_em timestamptz not null default now(),
          atualizado_em timestamptz not null default now()
        );
        alter table usuarios enable row level security;
        drop policy if exists "politica_acesso_usuarios" on usuarios;
        create policy "politica_acesso_usuarios" on usuarios for all using (true) with check (true);
        alter table calendarios add column if not exists publicado boolean not null default false;
      `
    });
  } catch (e) {
    // Se a RPC não estiver configurada, não interrompe a execução
  }
}

export async function syncUsuarioProfile(usuario) {
  if (!usuario) return null;
  const supabase = getSupabaseServer();
  await garantirTabelaUsuarios(supabase);

  try {
    const { data: existente, error: fetchErr } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", usuario.id)
      .maybeSingle();

    if (existente) {
      return existente;
    }

    // Verifica quantos usuários existem para definir se este será o 1º superusuário
    const { count } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    const eSuperusuario = count === 0 || count === null;

    const novoPerfil = {
      id: usuario.id,
      email: usuario.email,
      nome: nomeDoUsuario(usuario),
      avatar_url: usuario.user_metadata?.avatar_url || usuario.user_metadata?.picture || null,
      campus: "Pouso Alegre",
      pode_criar: true,
      pode_publicar: true,
      e_superusuario: eSuperusuario,
    };

    const { data: criado, error: insertErr } = await supabase
      .from("usuarios")
      .upsert(novoPerfil, { onConflict: "id" })
      .select();

    if (insertErr) {
      console.error("Erro ao inserir usuario em syncUsuarioProfile:", insertErr);
      return novoPerfil;
    }
    return Array.isArray(criado) ? criado[0] : criado || novoPerfil;
  } catch (e) {
    console.error("Exceção em syncUsuarioProfile:", e);
    return {
      id: usuario.id,
      email: usuario.email,
      nome: nomeDoUsuario(usuario),
      campus: "Pouso Alegre",
      pode_criar: true,
      pode_publicar: true,
      e_superusuario: true,
    };
  }
}

export async function listarTodosUsuarios() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function atualizarPerfilUsuario(id, dados) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("usuarios")
    .update({
      campus: dados.campus,
      pode_criar: dados.pode_criar,
      pode_publicar: dados.pode_publicar,
      e_superusuario: dados.e_superusuario,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
