import ExcelJS from "exceljs";
import {
  MESES_PT, DOM_SEG_TER, TIPOS, TIPOS_LETIVOS, DIAS_SEMANA_PT,
  CONFIG_TIPO, metasIndividuais, dateKey, CATEGORIAS_ATIVIDADE,
} from "./constants";
import { validarCalendario } from "./validation";
import { semanasDoMes, agruparNotas } from "./calendarGrid";

function formatarDataBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarPeriodoAtividade(a) {
  if (!a.dataFim || a.dataFim === a.dataInicio) return formatarDataBR(a.dataInicio);
  return `${formatarDataBR(a.dataInicio)} a ${formatarDataBR(a.dataFim)}`;
}

const ALTURA_TITULO = 20;
const ALTURA_HEADER = 16;
const ALTURA_DIA = 18;
const ALTURA_CONTADOR = 16;
const ALTURA_NOTA = 13;
const SEMANAS_POR_MES = 6;
const LARGURA_COL_DIA = 7.2;
const LARGURA_COL_GAP = 3;

function argb(hex) {
  return "FF" + hex.replace("#", "").toUpperCase();
}

function fillFor(hex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } };
}

const BORDA_FINA = { style: "thin", color: { argb: "FFBFBFBF" } };
const BORDA = { top: BORDA_FINA, bottom: BORDA_FINA, left: BORDA_FINA, right: BORDA_FINA };

const COR_TITULO = "#1F3864";
const COR_HEADER = "#263E74";
const COR_FORA_SEM_TEXTO = "#F2F2F2";
const COR_FDS_NAO_LETIVO = "#F9F9E1";

// Gera as semanas (domingo a sábado) de um mês, sempre completando até SEMANAS_POR_MES semanas.
// (implementação compartilhada em ./calendarGrid.js)

function rotuloCategoria(key) {
  const c = CATEGORIAS_ATIVIDADE.find((x) => x.key === key);
  return c ? c.label : key;
}

const RODAPE_ESQ = { c0: 1, c1: 14 };
const RODAPE_DIR = { c0: 16, c1: 28 };
const COR_RODAPE_TITULO = "#000000";
const COR_RODAPE_MES = "#D9D9D9";
const ALTURA_LINHA_RODAPE = 12;

function escreverRodape(ws, ano, eventos, linhaInicio) {
  const larguraBloco = (c0, c1) => {
    let total = 0;
    for (let c = c0; c <= c1; c++) total += ws.getColumn(c).width || 8.43;
    return total;
  };
  const alturas = new Map();
  const garantirAltura = (linha, h) => alturas.set(linha, Math.max(alturas.get(linha) || ALTURA_NOTA, h));

  const faixa = (linha, c0, c1, texto, cor, tam) => {
    ws.mergeCells(linha, c0, linha, c1);
    const c = ws.getCell(linha, c0);
    c.value = texto;
    c.font = { bold: true, size: tam, color: { argb: cor === COR_RODAPE_TITULO ? "FFFFFFFF" : "FF000000" } };
    c.fill = fillFor(cor);
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = BORDA;
    garantirAltura(linha, tam + 7);
  };

  // Todas as notas (já agrupadas em faixas) de um mês
  const notasDoMes = (mes) => {
    const ev = eventos
      .filter((e) => parseInt(e.key.slice(5, 7), 10) === mes)
      .map((e) => [e.dia, e.texto]);
    ev.sort((a, b) => a[0] - b[0]);
    return agruparNotas(ev, ano, mes);
  };

  // Escreve um mês (título + itens) a partir da linha `r`; devolve a próxima linha livre.
  const escreverBlocoMes = (r, { c0, c1 }, mes) => {
    const charsPorLinha = Math.max(20, Math.floor(larguraBloco(c0, c1) * 1.15));
    faixa(r, c0, c1, MESES_PT[mes - 1].toUpperCase(), COR_RODAPE_MES, 10);
    r += 1;
    for (const texto of notasDoMes(mes)) {
      ws.mergeCells(r, c0, r, c1);
      const c = ws.getCell(r, c0);
      c.value = texto;
      c.font = { size: 9 };
      c.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      const nLinhas = Math.max(1, Math.ceil(texto.length / charsPorLinha));
      garantirAltura(r, nLinhas * ALTURA_LINHA_RODAPE + 1);
      r += 1;
    }
    return r;
  };

  let linha = linhaInicio;
  faixa(linha, RODAPE_ESQ.c0, RODAPE_DIR.c1, "DEMAIS DATAS ÚTEIS", COR_RODAPE_TITULO, 11);
  linha += 1;

  // Janeiro..Junho à esquerda e Julho..Dezembro à direita; cada par de meses
  // (Jan/Jul, Fev/Ago, ...) começa na mesma linha, como no calendário manual.
  for (let i = 1; i <= 6; i++) {
    const fimEsq = escreverBlocoMes(linha, RODAPE_ESQ, i);
    const fimDir = escreverBlocoMes(linha, RODAPE_DIR, i + 6);
    linha = Math.max(fimEsq, fimDir) + 1; // linha em branco entre os pares de meses
  }

  for (const [r, h] of alturas) ws.getRow(r).height = h;
  return linha;
}

function escreverMes(ws, ano, mes, linha0, col0, dias, tipoCalendario, atividades = []) {
  const semanas = semanasDoMes(ano, mes);
  const cfg = CONFIG_TIPO[tipoCalendario] || CONFIG_TIPO.superior;

  ws.getRow(linha0).height = ALTURA_TITULO;
  ws.mergeCells(linha0, col0, linha0, col0 + 6);
  const ct = ws.getCell(linha0, col0);
  ct.value = `${MESES_PT[mes - 1]} / ${ano}`;
  ct.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  ct.fill = fillFor(COR_TITULO);
  ct.alignment = { horizontal: "center", vertical: "middle" };
  ct.border = BORDA;

  ws.getRow(linha0 + 1).height = ALTURA_HEADER;
  for (let i = 0; i < 7; i++) {
    const cell = ws.getCell(linha0 + 1, col0 + i);
    cell.value = DOM_SEG_TER[i];
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = fillFor(COR_HEADER);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDA;
  }

  let linha = linha0 + 2;
  // todos: todos os eventos do mês (vão para o rodapé "Demais datas úteis")
  // relevantes: apenas os que aparecem logo abaixo do calendário do mês
  const todos = [];
  const relevantes = [];
  const vistosTodos = new Set();
  const vistosRel = new Set();
  let contadorLetivos = 0;

  // Verificar se há marcos de período definidos no calendário
  const marcosGlobal = {};
  for (const [k, info] of Object.entries(dias)) {
    for (const m of info.marcos || []) {
      if (!marcosGlobal[m] || k < marcosGlobal[m]) marcosGlobal[m] = k;
    }
  }
  const temPeriodosDefinidos = cfg.nomesPeriodo.some((_, idx) => marcosGlobal[`inicio_periodo_${idx}`] && marcosGlobal[`fim_periodo_${idx}`]);

  for (const semana of semanas) {
    ws.getRow(linha).height = ALTURA_DIA;
    for (let i = 0; i < 7; i++) {
      const data = semana[i];
      const cell = ws.getCell(linha, col0 + i);
      cell.border = BORDA;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (data.getMonth() !== mes - 1) {
        cell.value = null;
        cell.fill = fillFor(COR_FORA_SEM_TEXTO);
        continue;
      }
      const key = dateKey(data);
      const info = dias[key] || { tipo: "fora", rotulo: null };
      cell.value = data.getDate();

      const wd = (data.getDay() + 6) % 7; // 0=Seg..6=Dom
      const temMarco = info.marcos && info.marcos.length > 0;
      const temMarcoPeriodo = temMarco && info.marcos.some((m) => m.startsWith("inicio_periodo_") || m.startsWith("fim_periodo_") || m === "inicio_ano" || m === "fim_ano");

      if (temMarcoPeriodo) {
        cell.fill = fillFor("#81D41A");
        cell.font = { bold: true, size: 10, color: { argb: argb("#16294a") } };
      } else if (info.tipo === "fora") {
        cell.fill = fillFor(wd < 5 ? TIPOS.fora.cor : COR_FDS_NAO_LETIVO);
        cell.font = { bold: true, size: 10, color: { argb: argb(TIPOS.fora.texto) } };
      } else {
        const t = TIPOS[info.tipo] || TIPOS.letivo;
        cell.fill = fillFor(t.cor);
        cell.font = { bold: true, size: 10, color: { argb: argb(t.texto) } };
      }

      // Verificar se o dia está dentro de algum período letivo ativo
      let dentroDePeriodo = true;
      if (temPeriodosDefinidos) {
        dentroDePeriodo = cfg.nomesPeriodo.some((_, idx) => {
          const ini = marcosGlobal[`inicio_periodo_${idx}`];
          const fim = marcosGlobal[`fim_periodo_${idx}`];
          return ini && fim && key >= ini && key <= fim;
        });
      }

      if (dentroDePeriodo && TIPOS_LETIVOS.has(info.tipo) && info.contaComo != null) {
        contadorLetivos += 1;
      }

      // Coleta de eventos do dia
      const dia = data.getDate();
      const addEvento = (texto, relevante) => {
        const id = `${key}|${texto}`;
        if (!vistosTodos.has(id)) {
          vistosTodos.add(id);
          todos.push({ key, dia, texto });
        }
        if (relevante && !vistosRel.has(id)) {
          vistosRel.add(id);
          relevantes.push([dia, texto]);
        }
      };
      // Dias "letivo"/"fora" com rótulo são observações comuns (só vão ao rodapé);
      // os demais tipos (sábado letivo, substituição, feriado, férias, recesso,
      // exame, conselho...) são relevantes e aparecem sob o mês.
      const tipoRelevante = info.tipo !== "letivo" && info.tipo !== "fora";
      const sufixoDia = info.contaComo != null ? ` (${DIAS_SEMANA_PT[info.contaComo]}-feira)` : "";

      if (info.rotulo) {
        addEvento(info.rotulo, tipoRelevante);
      } else if (info.tipo === "sabado_letivo") {
        addEvento(`Sábado letivo${sufixoDia}`, true);
      } else if (info.tipo === "substituicao") {
        addEvento(`Substituição${sufixoDia}`, true);
      } else if (info.tipo === "exame") {
        addEvento("Exame Final", true);
      } else if (info.tipo === "recuperacao") {
        addEvento("Recuperação", true);
      } else if (info.tipo === "recesso") {
        addEvento("Recesso Acadêmico", true);
      } else if (info.tipo === "conselho") {
        addEvento("Conselho de Classe", true);
      } else if (tipoRelevante && TIPOS[info.tipo]) {
        addEvento(TIPOS[info.tipo].label, true); // feriado, férias etc. sem rótulo
      }

      if (info.marcos && info.marcos.length > 0) {
        for (const m of info.marcos) {
          if (m === "inicio_ano") addEvento("Início do ano letivo", true);
          else if (m === "fim_ano") addEvento("Fim do ano letivo", true);
          else if (m.startsWith("inicio_periodo_")) {
            const idx = parseInt(m.replace("inicio_periodo_", ""), 10);
            const nomeP = cfg.nomesPeriodo[idx] || `${idx + 1}º Período`;
            addEvento(`Início do ${nomeP}`, true);
          } else if (m.startsWith("fim_periodo_")) {
            const idx = parseInt(m.replace("fim_periodo_", ""), 10);
            const nomeP = cfg.nomesPeriodo[idx] || `${idx + 1}º Período`;
            addEvento(`Fim do ${nomeP}`, true);
          }
        }
      }

      // Atividades/prazos acadêmicos: só no rodapé
      if (atividades && atividades.length > 0) {
        for (const atv of atividades) {
          if (key >= atv.dataInicio && key <= (atv.dataFim || atv.dataInicio)) {
            const sufixoAtv = atv.contaComoLetivo ? " (conta como dia letivo)" : "";
            addEvento((atv.desc || rotuloCategoria(atv.categoria)) + sufixoAtv, false);
          }
        }
      }
    }
    linha += 1;
  }

  relevantes.sort((a, b) => a[0] - b[0]);
  const notas = agruparNotas(relevantes, ano, mes);

  ws.getRow(linha).height = ALTURA_CONTADOR;
  ws.mergeCells(linha, col0, linha, col0 + 3);
  const cc = ws.getCell(linha, col0);
  cc.value = "Dias letivos";
  cc.font = { bold: true, size: 9 };
  cc.fill = fillFor("#9FC5E8");
  cc.alignment = { horizontal: "center", vertical: "middle" };
  cc.border = BORDA;
  ws.mergeCells(linha, col0 + 4, linha, col0 + 6);
  const cn = ws.getCell(linha, col0 + 4);
  cn.value = contadorLetivos;
  cn.font = { bold: true, size: 9 };
  cn.fill = fillFor("#CFE2F3");
  cn.alignment = { horizontal: "center", vertical: "middle" };
  cn.border = BORDA;
  linha += 1;

  for (const nota of notas) {
    ws.getRow(linha).height = ALTURA_NOTA;
    ws.mergeCells(linha, col0, linha, col0 + 6);
    const nc = ws.getCell(linha, col0);
    nc.value = nota;
    nc.font = { italic: true, size: 8, color: { argb: "FF333333" } };
    nc.alignment = { horizontal: "left", vertical: "middle" };
    linha += 1;
  }

  return { prox: linha + 1, eventos: todos };
}

export async function buildWorkbook({ ano, tipo, dias, atividades = [], campus = "" }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Calendário", { views: [{ showGridLines: false }] });
  const cfg = CONFIG_TIPO[tipo];
  const metasInd = metasIndividuais(tipo);
  const val = validarCalendario(dias, tipo, atividades);

  ws.mergeCells(1, 1, 1, 28);
  const t = ws.getCell(1, 1);
  t.value = `Calendário Acadêmico ${ano}`;
  t.font = { bold: true, size: 16, color: { argb: "FF1F3864" } };
  t.alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, 28);
  const s1 = ws.getCell(2, 1);
  s1.value = campus;
  s1.font = { bold: true, size: 12, color: { argb: "FF1F3864" } };
  s1.alignment = { horizontal: "center" };

  ws.mergeCells(3, 1, 3, 28);
  const s2 = ws.getCell(3, 1);
  s2.value = cfg.label;
  s2.font = { italic: true, size: 11, color: { argb: "FF1F3864" } };
  s2.alignment = { horizontal: "center" };

  const colInicioMeses = [1, 10, 19];
  const eventosAno = [];
  let linhaAtual = 5;
  for (let banda = 0; banda < 4; banda++) {
    let maxProx = linhaAtual;
    for (let i = 0; i < 3; i++) {
      const mes = banda * 3 + i + 1;
      const res = escreverMes(ws, ano, mes, linhaAtual, colInicioMeses[i], dias, tipo, atividades);
      maxProx = Math.max(maxProx, res.prox);
      eventosAno.push(...res.eventos);
    }
    linhaAtual = maxProx + 1;
  }

  const colunasDia = new Set();
  for (const c0 of colInicioMeses) for (let i = 0; i < 7; i++) colunasDia.add(c0 + i);
  const ultimaCol = Math.max(...colunasDia);
  for (let c = 1; c <= ultimaCol; c++) {
    ws.getColumn(c).width = colunasDia.has(c) ? LARGURA_COL_DIA : LARGURA_COL_GAP;
  }

  // ---------------- Legenda ----------------
  const legendaCol = ultimaCol + 2;
  let lr = 5;
  ws.getCell(lr, legendaCol).value = "Legenda";
  ws.getCell(lr, legendaCol).font = { bold: true, size: 12 };
  lr += 1;
  for (const [key, t2] of Object.entries(TIPOS)) {
    const cc = ws.getCell(lr, legendaCol);
    cc.fill = fillFor(t2.cor);
    cc.border = BORDA;
    ws.getCell(lr, legendaCol + 1).value = t2.label;
    ws.getCell(lr, legendaCol + 1).font = { size: 10 };
    lr += 1;
  }
  const ccMarco = ws.getCell(lr, legendaCol);
  ccMarco.fill = fillFor("#81D41A");
  ccMarco.border = BORDA;
  ws.getCell(lr, legendaCol + 1).value = "Início / Fim de Período";
  ws.getCell(lr, legendaCol + 1).font = { size: 10 };
  lr += 1;
  ws.getColumn(legendaCol).width = 4;
  ws.getColumn(legendaCol + 1).width = 28;

  // ---------------- Períodos letivos ----------------
  lr += 1;
  ws.getCell(lr, legendaCol).value = "Períodos letivos";
  ws.getCell(lr, legendaCol).font = { bold: true, size: 12 };
  lr += 1;
  for (const p of val.periodos) {
    ws.getCell(lr, legendaCol).value = p.nome;
    ws.getCell(lr, legendaCol).font = { bold: true, size: 10 };
    lr += 1;
    ws.getCell(lr, legendaCol).value = `Início: ${p.inicio || "—"}`;
    ws.getCell(lr, legendaCol).font = { size: 9 };
    lr += 1;
    ws.getCell(lr, legendaCol).value = `Término: ${p.fim || "—"}`;
    ws.getCell(lr, legendaCol).font = { size: 9 };
    lr += 1;
    ws.getCell(lr, legendaCol).value = `Dias letivos: ${p.dias == null ? "—" : p.dias} (meta ${p.meta})`;
    ws.getCell(lr, legendaCol).font = { size: 9 };
    lr += 2;
  }

  // ---------------- Contagem por dia da semana ----------------
  ws.getCell(lr, legendaCol).value = "Dias letivos por dia da semana";
  ws.getCell(lr, legendaCol).font = { bold: true, size: 12 };
  lr += 1;
  for (let wd = 0; wd < 5; wd++) {
    ws.getCell(lr, legendaCol).value = DIAS_SEMANA_PT[wd];
    ws.getCell(lr, legendaCol).font = { size: 9 };
    ws.getCell(lr, legendaCol + 1).value = val.contagem[wd];
    ws.getCell(lr, legendaCol + 1).font = { size: 9, bold: true };
    lr += 1;
  }
  ws.getCell(lr, legendaCol).value = "TOTAL";
  ws.getCell(lr, legendaCol).font = { bold: true, size: 10 };
  ws.getCell(lr, legendaCol + 1).value = val.total;
  ws.getCell(lr, legendaCol + 1).font = { bold: true, size: 10 };
  lr += 2;

  ws.getCell(lr, legendaCol).value = val.ok ? "Status: OK ✅" : "Status: pendências — ver aba Relatório";
  ws.getCell(lr, legendaCol).font = { bold: true, color: { argb: val.ok ? "FF1E7B34" : "FFC00000" } };

  // ---------------- Rodapé: "Demais datas úteis" (2 colunas por semestre, agrupado por mês) ----------------
  escreverRodape(ws, ano, eventosAno, linhaAtual + 1);

  // ---------------- Aba de relatório ----------------
  const ws2 = wb.addWorksheet("Relatório de Validação");
  ws2.getColumn(1).width = 100;
  ws2.getCell(1, 1).value = `Relatório de validação — gerado em ${new Date().toLocaleString("pt-BR")}`;
  ws2.getCell(1, 1).font = { bold: true, size: 13 };
  let rr = 3;
  ws2.getCell(rr, 1).value = val.ok ? "STATUS: OK ✅" : "STATUS: PENDÊNCIAS ⚠️";
  ws2.getCell(rr, 1).font = { bold: true, size: 11, color: { argb: val.ok ? "FF1E7B34" : "FFC00000" } };
  rr += 2;
  const grupos = [];
  const indicePorNome = new Map();
  for (const item of val.checklist) {
    const nome = item.grupo || "Geral";
    if (!indicePorNome.has(nome)) {
      indicePorNome.set(nome, grupos.length);
      grupos.push({ nome, itens: [] });
    }
    grupos[indicePorNome.get(nome)].itens.push(item);
  }
  for (const g of grupos) {
    ws2.getCell(rr, 1).value = g.nome;
    ws2.getCell(rr, 1).font = { bold: true, size: 11, color: { argb: "FF1F3864" } };
    rr += 1;
    for (const item of g.itens) {
      const icone = item.informativo ? "ℹ️ " : (item.ok ? "✅ " : "⚠️ ");
      ws2.getCell(rr, 1).value = "  " + icone + item.msg;
      ws2.getCell(rr, 1).font = { size: 10, name: "Consolas" };
      rr += 1;
    }
    rr += 1;
  }

  return wb;
}
