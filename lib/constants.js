// Nomes e constantes compartilhadas entre a UI e a exportação para Excel.

export const DIAS_SEMANA_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const DIAS_SEMANA_ABREV = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const DOM_SEG_TER = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Conversão: JS Date.getDay() (0=Dom..6=Sáb) -> índice "python style" (0=Seg..6=Dom)
export function pyWeekday(date) {
  return (date.getDay() + 6) % 7;
}

// Tipos de classificação de um dia e sua cor de preenchimento (mesma paleta do gerador .xlsx)
export const TIPOS = {
  letivo: { label: "Dia letivo", cor: "#FFFFFF", texto: "#263E74" },
  recuperacao: { label: "Recuperação", cor: "#F1C232", texto: "#263E74" },
  substituicao: { label: "Substituição de dia", cor: "#FF9900", texto: "#FFFFFF" },
  feriado: { label: "Feriado", cor: "#FFDDDD", texto: "#263E74" },
  recesso: { label: "Recesso Acadêmico", cor: "#FF0000", texto: "#FFFFFF" },
  ferias: { label: "Férias escolares", cor: "#00FFFF", texto: "#263E74" },
  sabado_letivo: { label: "Sábado letivo", cor: "#38761D", texto: "#FFFFFF" },
  exame: { label: "Exame Final", cor: "#FF00FF", texto: "#FFFFFF" },
  fora: { label: "Fora do período letivo", cor: "#F9F9E1", texto: "#5b6472" },
};

// Esfera do feriado (apenas para rotular — os federais já são calculados automaticamente)
export const ESFERAS_FERIADO = [
  { key: "federal", label: "Federal" },
  { key: "estadual", label: "Estadual" },
  { key: "municipal", label: "Municipal" },
];

// tipos que contam como dia letivo para as metas de 40/dia da semana e 200 no total.
// Observação importante: "recuperacao" só entra nessa contagem quando o dia tiver
// contaComo definido (ou seja, quando marcado como realizado em contraturno) — por
// padrão a recuperação NÃO conta como dia letivo. O mesmo vale para reuniões/conselhos
// de classe marcados como "conta como letivo".
export const TIPOS_LETIVOS = new Set(["letivo", "recuperacao", "substituicao", "sabado_letivo"]);

// Categorias oficiais de atividades/prazos acadêmicos (fora da grade de cores do
// calendário) — cobrem os itens de planejamento, matrícula, recuperação, colação etc.
// `contaComoLetivoDisponivel`: quando true, a interface oferece a opção de marcar que
// aquele dia específico conta como dia letivo (reuniões/conselhos com atividades
// envolvendo estudantes, ou realizados no contraturno).
export const CATEGORIAS_ATIVIDADE = [
  { key: "evento", label: "Evento institucional", contaComoLetivoDisponivel: false },
  { key: "planejamento", label: "Planejamento pedagógico", contaComoLetivoDisponivel: false },
  { key: "matricula", label: "Matrícula", contaComoLetivoDisponivel: false },
  { key: "rematricula", label: "Rematrícula", contaComoLetivoDisponivel: false },
  { key: "quadro_horarios", label: "Prazo-limite: divulgação do quadro de horários", contaComoLetivoDisponivel: false },
  { key: "planos_ensino", label: "Prazo-limite: entrega dos planos de ensino", contaComoLetivoDisponivel: false },
  { key: "aproveitamento", label: "Solicitação de aproveitamento de estudos", contaComoLetivoDisponivel: false },
  { key: "trancamento", label: "Solicitação de trancamento (disciplina/matrícula)", contaComoLetivoDisponivel: false },
  { key: "transferencia", label: "Transferência / novo título / reingresso (edital próprio)", contaComoLetivoDisponivel: false },
  { key: "reuniao", label: "Reunião com a comunidade escolar", contaComoLetivoDisponivel: true },
  { key: "conselho", label: "Conselho de Classe", contaComoLetivoDisponivel: true },
  { key: "estagio_tcc", label: "Entrega de documentação de estágio/TCC", contaComoLetivoDisponivel: false },
  { key: "recuperacao_periodo", label: "Período de recuperação", contaComoLetivoDisponivel: false },
  { key: "resultados", label: "Divulgação de resultados acadêmicos", contaComoLetivoDisponivel: false },
  { key: "conselho_final", label: "Conselho de Classe Final", contaComoLetivoDisponivel: false },
  { key: "colacao", label: "Colação de grau / formatura", contaComoLetivoDisponivel: false },
  { key: "outro", label: "Outro", contaComoLetivoDisponivel: false },
];

export function categoriaInfo(key) {
  return CATEGORIAS_ATIVIDADE.find((c) => c.key === key) || CATEGORIAS_ATIVIDADE[CATEGORIAS_ATIVIDADE.length - 1];
}

export const CONFIG_TIPO = {
  superior: {
    label: "Cursos Superiores (2 semestres)",
    nomesPeriodo: ["1º Semestre", "2º Semestre"],
    metasCumulativas: [100, 200],
  },
  tecnico_bimestral: {
    label: "Cursos Técnicos — Regime Bimestral (4 bimestres)",
    nomesPeriodo: ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"],
    metasCumulativas: [50, 100, 150, 200],
  },
  tecnico_trimestral: {
    label: "Cursos Técnicos — Regime Trimestral (3 trimestres)",
    nomesPeriodo: ["1º Trimestre", "2º Trimestre", "3º Trimestre"],
    metasCumulativas: [67, 134, 200],
  },
};

// Metas: valores MÍNIMOS. O ano letivo pode ter mais de 200 dias e um período pode
// ter mais dias letivos que a meta — isso não é problema, só o contrário é.
export const META_POR_DIA_SEMANA = 40;
export const META_FERIAS_DOCENTES = 45; // esse aqui é um valor exato (dias corridos de férias)

export function metasIndividuais(tipo) {
  const cum = CONFIG_TIPO[tipo].metasCumulativas;
  return cum.map((m, i) => (i === 0 ? m : m - cum[i - 1]));
}

// chave de data usada no state: "YYYY-MM-DD" (sempre em horário local, sem fuso)
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Lista todas as chaves de data entre duas chaves "YYYY-MM-DD", inclusive.
export function enumerarIntervalo(inicioKey, fimKey) {
  const chaves = [];
  let cursor = keyToDate(inicioKey);
  const fimData = keyToDate(fimKey);
  while (cursor <= fimData) {
    chaves.push(dateKey(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return chaves;
}
