import { keyToDate } from "./constants";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const TIPOS_LETIVOS_LOCAIS = new Set(["letivo", "recuperacao", "substituicao", "sabado_letivo"]);

// periodo: { inicio, fim } (chaves "YYYY-MM-DD", já validadas / podem ser null)
// dias: mapa efetivo do calendário inteiro
export function resumoPeriodo(periodo, dias) {
  const vazio = { meses: [], mesesNomes: [], porDiaSemana: [0, 1, 2, 3, 4].map((wd) => ({ wd, porMes: [], total: 0 })), totalPorMes: [], totalGeral: 0 };
  if (!periodo || !periodo.inicio || !periodo.fim) return vazio;

  const porMesPorDia = {}; // mesIdx(0-11) -> [{comum,sabado} x5]
  const mesesSet = new Set();

  for (const [key, info] of Object.entries(dias)) {
    if (key < periodo.inicio || key > periodo.fim) continue;
    if (info.contaComo == null || !TIPOS_LETIVOS_LOCAIS.has(info.tipo)) continue;

    const d = keyToDate(key);
    const mesIdx = d.getMonth();
    const wdReal = (d.getDay() + 6) % 7; // 0=Seg..6=Dom
    const ehSabado = wdReal === 5;

    mesesSet.add(mesIdx);
    if (!porMesPorDia[mesIdx]) {
      porMesPorDia[mesIdx] = [0, 1, 2, 3, 4].map(() => ({ comum: 0, sabado: 0 }));
    }
    const alvo = info.contaComo;
    if (ehSabado) porMesPorDia[mesIdx][alvo].sabado += 1;
    else porMesPorDia[mesIdx][alvo].comum += 1;
  }

  const meses = Array.from(mesesSet).sort((a, b) => a - b);
  const porDiaSemana = [0, 1, 2, 3, 4].map((wd) => {
    const porMes = meses.map((m) => ({
      mes: m,
      comum: porMesPorDia[m][wd].comum,
      sabado: porMesPorDia[m][wd].sabado,
    }));
    const total = porMes.reduce((s, x) => s + x.comum + x.sabado, 0);
    return { wd, porMes, total };
  });

  const totalPorMes = meses.map((m) => {
    const comum = porMesPorDia[m].reduce((s, x) => s + x.comum, 0);
    const sabado = porMesPorDia[m].reduce((s, x) => s + x.sabado, 0);
    return { mes: m, comum, sabado, total: comum + sabado };
  });

  const totalGeral = totalPorMes.reduce((s, x) => s + x.total, 0);

  return {
    meses,
    mesesNomes: meses.map((m) => MESES_ABREV[m]),
    porDiaSemana,
    totalPorMes,
    totalGeral,
  };
}
