# Calendário Acadêmico — app web

App interativo (Next.js) para montar o calendário acadêmico clicando ou
arrastando sobre os dias. Funciona como um documento do Google Sheets: exige
**login com o Google**, cada calendário tem seu próprio link, **salva
sozinho a cada alteração** (sem nenhum botão de "Salvar"), pode ser
**compartilhado em três níveis de acesso** (Editor, Comentador,
Visualizador) e editado por várias pessoas ao mesmo tempo, com **histórico
de versões** para voltar atrás quando precisar.

## Como funciona a experiência

- **Login obrigatório com o Google**: ninguém acessa nada — nem para só
  visualizar — sem entrar com uma conta Google primeiro. É o que garante que
  o nome que aparece no histórico e nos comentários é real (não um texto
  que a pessoa digitou).
- **Tela inicial ("Meus calendários")**: lista os calendários já criados e
  tem um botão **"+ Criar novo calendário"**.
- **Autosave**: qualquer alteração é salva automaticamente ~1 segundo depois
  de você parar de mexer. Um indicador no topo mostra "Salvo", "Salvando..."
  ou um aviso se a conexão falhar.
- **Colaboração em tempo real**: quem estiver com o mesmo calendário aberto
  vê, ao vivo, o que as outras pessoas estão fazendo — o app funde as
  mudanças por campo, então uma edição sua ainda não salva não é apagada
  por uma alteração de outra pessoa em outro lugar.
- **Compartilhar em 3 níveis** (botão 🔗 Compartilhar): cada nível gera um
  link diferente —
  - **Editor**: mesmo acesso de quem criou o calendário — pode alterar tudo.
  - **Comentador**: não pode alterar o calendário, mas pode deixar
    comentários (visíveis para todo mundo).
  - **Visualizador**: só vê e exporta — não altera nem comenta. Ainda pode
    clicar em "Duplicar" para criar sua própria cópia editável.
  - Quem recebe qualquer um desses links **também precisa entrar com o
    Google** para acessar — o link decide o que a pessoa pode fazer, o
    login confirma quem ela é.
- **Histórico de versões** (botão 🕑 Histórico, só para quem tem o link de
  Editor): mostra os pontos anteriores do calendário, quem editou cada um
  de verdade (nome vindo do Google, não dá pra forjar) — dá pra filtrar por
  pessoa — e um botão para **restaurar** qualquer um deles.
- **Comentários**: qualquer link (Editor, Comentador ou Visualizador) mostra
  os comentários já deixados; só Editor e Comentador podem escrever novos,
  sempre assinados com o nome real da conta Google de quem comentou.

## O que o calendário em si oferece

- Mostra o ano inteiro em mini-calendários (Jan a Dez), com as mesmas cores
  do modelo em Excel. Feriados nacionais já vêm marcados automaticamente
  (inclusive os móveis: Carnaval, Sexta-feira Santa, Corpus Christi).
- **Barra de ferramentas no estilo "clique e arraste"**: escolha um botão
  (Férias, Recesso, Feriado, Sábado letivo, Exame Final, Início/Fim de
  semestre, Evento, Conselho de Classe...) e clique e arraste sobre os dias.
- **Clicar diretamente em um dia** abre um menu enxuto: primeiro você
  escolhe o que quer fazer, e só depois aparecem os campos daquela escolha
  específica. Marcos de início/fim do ano letivo e de período podem ser
  marcados em conjunto no mesmo dia.
- Painel de validação agrupado por período, cobrindo os requisitos
  institucionais: mínimo de 200 dias letivos/40 por dia da semana, ideal de
  cada período detalhado por dia da semana, períodos que não podem se
  sobrepor, Exame Final obrigatório (não conta como letivo), Recuperação
  obrigatória nos técnicos (sempre conta como letivo), Conselho de Classe
  Final obrigatório (não conta como letivo), recomendação de Colação de
  Grau até 31/08, e os 45 dias corridos de férias.
- **Atividades e prazos acadêmicos**: lista categorizada (evento,
  planejamento pedagógico, matrícula, rematrícula, prazos de quadro de
  horários/planos de ensino, aproveitamento de estudos, trancamento,
  transferência/reingresso, estágio/TCC, recuperação, divulgação de
  resultados, conselho de classe, conselho de classe final, colação de
  grau).
- **Resumo por período**: tabela mês a mês com dias "Comum" x "Sábado
  letivo" por dia da semana.
- **Exportar para Excel**: gera o `.xlsx` no layout do modelo original.

## Rodando localmente

Pré-requisito: Node.js 18 ou mais recente.

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — sem o Supabase configurado (próxima seção), a
tela de login aparece mas o botão "Entrar com o Google" não funciona.

## Configurando o Supabase e o login do Google

**1. Crie um projeto gratuito em [supabase.com](https://supabase.com).**

**2. Rode o script `supabase_schema.sql`** (na raiz deste projeto) no SQL
Editor do seu projeto Supabase. Ele cria as tabelas `calendarios`,
`calendario_versoes` e `calendario_comentarios`, os tokens de
compartilhamento por papel, e já deixa tudo pronto para o Realtime.

> Se você já rodava uma versão anterior deste app, pode rodar o mesmo
> script de novo — ele usa `if not exists`/`add column if not exists` e é
> seguro rodar mais de uma vez.

**3. Ative o login com Google no Supabase:**
1. No [Google Cloud Console](https://console.cloud.google.com/), crie (ou
   use) um projeto → "APIs & Services" → "Credentials" → "Create
   Credentials" → "OAuth client ID" → tipo "Web application".
2. Em "Authorized redirect URIs", adicione:
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   (o endereço exato aparece na tela do Supabase do passo seguinte).
3. Copie o **Client ID** e o **Client Secret** gerados.
4. No painel do Supabase: Authentication → Providers → **Google** → ative,
   cole o Client ID e o Client Secret, salve.
5. Ainda em Authentication → URL Configuration → **Redirect URLs**,
   adicione as URLs do seu app, por exemplo:
   `http://localhost:3000/**` (para testar localmente) e
   `https://seu-app.vercel.app/**` (depois de publicar).

**4. Pegue as credenciais do projeto** em Project Settings → API: a
"Project URL", a chave **service_role** e a chave **anon public**.

**5. Configure as variáveis de ambiente** (veja `.env.example`):
```
# só no servidor — nunca aparecem no navegador
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service_role

# no navegador — login com Google + colaboração em tempo real
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-public
```
- Localmente: crie um arquivo `.env.local` na raiz com essas quatro linhas.
- Na Vercel: Project Settings → Environment Variables → adicione as quatro.

**Importante:** qualquer pessoa com uma conta Google consegue entrar no
app — não há uma lista de e-mails permitidos por padrão. O que controla o
que cada pessoa pode fazer é o link que ela recebeu (Editor, Comentador ou
Visualizador), não o e-mail dela. Se precisar restringir quem pode logar
(por exemplo, só e-mails `@suainstituicao.edu.br`), isso se configura no
próprio Google Cloud (nas telas de consentimento OAuth, restringindo o
domínio da organização) — não é algo que o código deste app controla hoje.

## Como o login e as permissões funcionam por baixo dos panos

- O navegador usa a chave "anon" do Supabase só para autenticar (Supabase
  Auth) e para a sincronização em tempo real — nunca para ler ou gravar
  calendários diretamente.
- Toda vez que o app chama uma rota de API (`/api/calendarios/...` ou
  `/api/compartilhado/...`), ele manda o token da sessão atual num cabeçalho
  `Authorization: Bearer <token>`. A rota verifica esse token contra o
  Supabase Auth antes de fazer qualquer coisa — **sem um login válido, toda
  rota responde 401**, mesmo que a pessoa tenha um link de compartilhamento
  correto.
- O **nome do autor** salvo no histórico e nos comentários vem sempre do
  token verificado no servidor (nome/e-mail da conta Google) — nunca de um
  campo que o navegador manda no corpo da requisição. Isso impede alguém de
  "se passar" por outra pessoa no histórico.
- Cada calendário tem 3 tokens aleatórios (`token_editor`, `token_comentador`,
  `token_visualizador`). O link de quem **criou** o calendário
  (`/calendario/<id>`) sempre abre como Editor. Os links do diálogo
  "Compartilhar" (`/c/<token>`) passam pela rota
  `/api/compartilhado/<token>`, que descobre o papel a partir do token e
  **nunca devolve o identificador interno do calendário nem os outros
  tokens** para quem entrou por um link de Comentador ou Visualizador —
  então não dá pra "promover" o próprio acesso trocando a URL.

## Como a colaboração em tempo real e o histórico funcionam

Cada alteração agenda um salvamento (~700ms depois da última mudança). O
navegador está inscrito num canal do Supabase Realtime para aquele
calendário; quando alguém salva, todo mundo inscrito recebe o registro
antigo e o novo, e o app aplica só o que realmente mudou por cima do estado
local.

Antes de cada gravação, a rota de salvamento decide se guarda um
"checkpoint" do estado **anterior** no histórico: só quando o autor mudou
desde o último checkpoint, ou já se passaram alguns minutos — assim o
histórico não vira uma lista com uma entrada por segundo. Restaurar uma
versão salva o estado atual como mais um checkpoint antes de aplicar a
versão escolhida — então a restauração em si também pode ser desfeita.

## Publicando na Vercel

**Opção A — pelo painel da Vercel (mais simples):**
1. Suba esta pasta para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em vercel.com, clique em "Add New… → Project" e importe o repositório.
3. Em "Environment Variables", adicione as quatro variáveis do Supabase.
4. Clique em "Deploy".
5. Depois do primeiro deploy, volte no Supabase (Authentication → URL
   Configuration → Redirect URLs) e adicione a URL definitiva da Vercel.

**Opção B — pela CLI da Vercel:**
```bash
npm install -g vercel
vercel login
vercel        # primeiro deploy (ambiente de preview)
vercel --prod # publica em produção
```

## Estrutura do projeto

```
app/
  page.js                       - tela inicial ("Meus calendários")
  calendario/[id]/page.js       - editor pelo link "dono" (sempre Editor)
  c/[token]/page.js             - editor pelo link compartilhado (papel vem do token)
  layout.js                     - layout raiz, envolve tudo com <AuthGate>
  globals.css
  api/export/route.js                          - gera o .xlsx (exige login)
  api/calendarios/route.js                      - lista (GET) e cria (POST)
  api/calendarios/[id]/route.js                 - busca/atualiza/exclui (rota "dono")
  api/calendarios/[id]/clonar/route.js          - duplica
  api/calendarios/[id]/comentarios/route.js     - comentários (rota "dono")
  api/calendarios/[id]/versoes/route.js         - lista o histórico (com filtro por autor)
  api/calendarios/[id]/versoes/[versaoId]/route.js - restaura uma versão
  api/compartilhado/[token]/route.js            - busca/atualiza pelo link compartilhado
  api/compartilhado/[token]/clonar/route.js     - duplica pelo link compartilhado
  api/compartilhado/[token]/comentarios/route.js - comentários pelo link compartilhado
components/
  AuthGate.js           - exige login do Google antes de mostrar qualquer coisa
  Lobby.js, CalendarApp.js, Toolbar.js, MonthGrid.js, DayPopover.js
  ValidationPanel.js, AtividadesPanel.js, PeriodSummaryTable.js
  ShareDialog.js       - diálogo com os 3 links de compartilhamento
  HistoricoModal.js     - histórico de versões (filtro + restaurar)
  ComentariosPanel.js    - lista + formulário de comentários
lib/
  constants.js, holidays.js, effective.js, validation.js, periodSummary.js, calendarGrid.js, buildWorkbook.js
  supabaseServer.js          - cliente Supabase server-only (service role)
  supabaseClient.js           - cliente Supabase do navegador (anon key) — login e Realtime
  useAuth.js                   - hook: sessão atual, entrar/sair
  AuthContext.js                 - deixa o usuário logado disponível em qualquer componente
  apiFetch.js                     - fetch que anexa o token de login em toda chamada
  auth.js                          - (servidor) verifica o token recebido em cada rota
  useCalendarioColaborativo.js       - hook: carrega, autosalva, sincroniza ao vivo, sabe o papel atual
  mergeRemoto.js                      - funções de mesclagem da sincronização ao vivo
  compartilhamento.js                  - resolve token -> calendário + papel; clonagem
  versionamento.js                      - decide quando criar um checkpoint de histórico
supabase_schema.sql   - script único para criar/atualizar todas as tabelas no Supabase
.env.example          - modelo das variáveis de ambiente do Supabase
```

## Observações

- **Recuperação** sempre conta como dia letivo. Nos cursos técnicos, o app
  exige ao menos um dia assim e confere que esteja dentro de algum período.
- O **exame final** e o **conselho de classe final** não contam como dia
  letivo.
- Um marco de período só existe em um dia por vez: marcá-lo em um novo dia
  move o marco para lá.
- Duas pessoas editando o **mesmo** dia ao mesmo tempo seguem a regra de "o
  último a salvar vence" para aquele dia específico.
- Excluir um calendário na tela inicial é definitivo (pede confirmação).
- Não testei o login do Google de ponta a ponta com credenciais reais (esse
  ambiente de desenvolvimento não tem acesso à internet para isso) — testei
  exaustivamente a parte que dá pra testar sem rede real: todas as rotas de
  API exigindo e verificando o token corretamente, a atribuição de autor
  vindo só do token (nunca do que o navegador manda), e o app inteiro
  funcionando com uma sessão simulada. Vale testar o fluxo real de "Entrar
  com o Google" assim que configurar suas credenciais, antes de divulgar
  o link para outras pessoas.
