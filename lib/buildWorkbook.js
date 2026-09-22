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

function escreverMes(ws, ano, mes, linha0, col0, dias) {
  const semanas = semanasDoMes(ano, mes);

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
  const eventosDia = [];
  let contadorLetivos = 0;

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
      if (info.tipo === "fora") {
        cell.fill = fillFor(wd < 5 ? TIPOS.fora.cor : COR_FDS_NAO_LETIVO);
        cell.font = { bold: true, size: 10, color: { argb: wd < 5 ? "FFFFFFFF" : "FF263E74" } };
      } else {
        const t = TIPOS[info.tipo] || TIPOS.letivo;
        cell.fill = fillFor(t.cor);
        cell.font = { bold: true, size: 10, color: { argb: argb(t.texto) } };
      }

      if (TIPOS_LETIVOS.has(info.tipo)) contadorLetivos += 1;
      if (info.rotulo) eventosDia.push([data.getDate(), info.rotulo]);
    }
    linha += 1;
  }

  eventosDia.sort((a, b) => a[0] - b[0]);
  const notas = agruparNotas(eventosDia);

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

  return linha + 1;
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
  let linhaAtual = 5;
  for (let banda = 0; banda < 4; banda++) {
    let maxProx = linhaAtual;
    for (let i = 0; i < 3; i++) {
      const mes = banda * 3 + i + 1;
      const prox = escreverMes(ws, ano, mes, linhaAtual, colInicioMeses[i], dias);
      maxProx = Math.max(maxProx, prox);
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

  // ---------------- Rodapé: atividades e prazos acadêmicos (agrupados por categoria) ----------------
  let lrod = linhaAtual + 1;
  ws.getCell(lrod, 1).value = "Atividades e Prazos Acadêmicos";
  ws.getCell(lrod, 1).font = { bold: true, size: 14, color: { argb: "FF1F3864" } };
  lrod += 2;

  const porCategoria = new Map();
  for (const a of atividades) {
    if (!porCategoria.has(a.categoria)) porCategoria.set(a.categoria, []);
    porCategoria.get(a.categoria).push(a);
  }
  for (const cat of CATEGORIAS_ATIVIDADE) {
    const lista = porCategoria.get(cat.key);
    if (!lista || !lista.length) continue;
    ws.getCell(lrod, 1).value = cat.label;
    ws.getCell(lrod, 1).font = { bold: true, size: 11, color: { argb: "FF1F3864" } };
    lrod += 1;
    for (const a of [...lista].sort((x, y) => x.dataInicio.localeCompare(y.dataInicio))) {
      const periodo = formatarPeriodoAtividade(a);
      const sufixo = a.contaComoLetivo ? " (conta como dia letivo)" : "";
      ws.getCell(lrod, 1).value = `  ${periodo}${a.desc ? " — " + a.desc : ""}${sufixo}`;
      ws.getCell(lrod, 1).font = { size: 9.5 };
      lrod += 1;
    }
    lrod += 1;
  }

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
