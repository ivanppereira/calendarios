-- Rode este script uma vez no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new)

create extension if not exists "pgcrypto";

create table if not exists calendarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano integer not null,
  tipo text not null,
  campus text default '',
  overrides jsonb not null default '{}'::jsonb,
  marcos jsonb not null default '{}'::jsonb,
  atividades jsonb not null default '[]'::jsonb,
  token_editor uuid not null default gen_random_uuid(),
  token_comentador uuid not null default gen_random_uuid(),
  token_visualizador uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- se a tabela já existia de uma versão anterior deste app, garante as colunas novas
alter table calendarios add column if not exists token_editor uuid not null default gen_random_uuid();
alter table calendarios add column if not exists token_comentador uuid not null default gen_random_uuid();
alter table calendarios add column if not exists token_visualizador uuid not null default gen_random_uuid();
alter table calendarios add column if not exists dono_id text;
alter table calendarios add column if not exists dono_email text;

create unique index if not exists idx_calendarios_token_editor on calendarios (token_editor);
create unique index if not exists idx_calendarios_token_comentador on calendarios (token_comentador);
create unique index if not exists idx_calendarios_token_visualizador on calendarios (token_visualizador);
create index if not exists idx_calendarios_dono_email on calendarios (dono_email);

-- ---------------------------------------------------------------------------
-- Permissões por E-mail: compartilhamento direto com pessoas específicas
-- ---------------------------------------------------------------------------
create table if not exists calendario_permissoes (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references calendarios(id) on delete cascade,
  email text not null,
  papel text not null check (papel in ('editor', 'comentador', 'visualizador')),
  criado_em timestamptz not null default now(),
  unique (calendario_id, email)
);
create index if not exists idx_permissoes_email on calendario_permissoes (email);
alter table calendario_permissoes enable row level security;

-- ---------------------------------------------------------------------------
-- Histórico de versões: um "checkpoint" do estado do calendário em um momento
-- passado, para poder voltar atrás. Guardado automaticamente pelo autosave
-- (no máximo um a cada poucos minutos, ou quando muda o autor) e também toda
-- vez que alguém restaura uma versão anterior.
-- ---------------------------------------------------------------------------
-- rastreia quem editou por último e quando foi o último checkpoint de
-- histórico — usado para decidir quando criar um novo checkpoint e para
-- atribuir corretamente cada versão a quem de fato a escreveu
alter table calendarios add column if not exists ultimo_autor_id text;
alter table calendarios add column if not exists ultimo_autor_nome text;
alter table calendarios add column if not exists ultima_versao_em timestamptz;

create table if not exists calendario_versoes (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references calendarios(id) on delete cascade,
  autor_id text,
  autor_nome text,
  nome text,
  ano integer,
  tipo text,
  campus text,
  overrides jsonb,
  marcos jsonb,
  atividades jsonb,
  motivo text not null default 'autosave', -- 'autosave' | 'restauracao'
  criado_em timestamptz not null default now()
);
create index if not exists idx_versoes_calendario on calendario_versoes (calendario_id, criado_em desc);
alter table calendario_versoes enable row level security;
-- sem policies públicas: o histórico só é lido/gravado pelas rotas de API
-- (service role), nunca diretamente pelo navegador.

-- ---------------------------------------------------------------------------
-- Comentários: usados pelo papel "Comentador" (e também disponível ao
-- "Editor"), opcionalmente associados a um dia específico do calendário.
-- ---------------------------------------------------------------------------
create table if not exists calendario_comentarios (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references calendarios(id) on delete cascade,
  autor_id text,
  autor_nome text,
  data_referencia date,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_comentarios_calendario on calendario_comentarios (calendario_id, criado_em desc);
alter table calendario_comentarios enable row level security;
-- idem: sem policies públicas, acesso só pelas rotas de API.

-- mantém updated_at sempre atualizado automaticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calendarios_updated_at on calendarios;
create trigger trg_calendarios_updated_at
before update on calendarios
for each row execute function set_updated_at();

-- Row Level Security: habilitada. Escritas continuam só pelas rotas de API do
-- Next.js (app/api/calendarios/... e app/api/compartilhado/...), que usam a
-- service role key (só existe no servidor) e por isso contornam a RLS. A
-- policy de leitura abaixo é só para permitir que o NAVEGADOR (chave anônima)
-- receba as atualizações em tempo real (Realtime) e a contagem de
-- colaboradores online — sem ela, a sincronização ao vivo não funciona.
alter table calendarios enable row level security;

drop policy if exists "leitura publica para realtime" on calendarios;
create policy "leitura publica para realtime" on calendarios
  for select using (true);

-- necessário para o Realtime enviar o registro ANTIGO junto com o NOVO em cada
-- atualização — é isso que permite mesclar mudanças de dois editores diferentes
-- sem que um "apague" o que o outro acabou de digitar.
alter table calendarios replica identity full;

-- habilita a transmissão de mudanças desta tabela pelo Realtime (idempotente —
-- pode rodar este script mais de uma vez sem dar erro)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calendarios'
  ) then
    alter publication supabase_realtime add table calendarios;
  end if;
end $$;
