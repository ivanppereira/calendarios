import { pyWeekday, dateKey, TIPOS_LETIVOS } from "./constants";
import { feriadosNacionais } from "./holidays";

// overrides: { "YYYY-MM-DD": { tipo, contaComo, rotulo } }  — definidos pelo usuário ao clicar num dia
// marcosPorDia: { "YYYY-MM-DD": string[] }  — "inicio_ano", "fim_ano", "inicio_periodo_0", "fim_periodo_0", ...
export function buildEffectiveDias(ano, overrides, marcosPorDia) {
  const feriados = new Map([
    ...feriadosNacionais(ano - 1),
    ...feriadosNacionais(ano),
    ...feriadosNacionais(ano + 1),
  ]);

  let inicioAno = null;
  let fimAno = null;
  for (const [key, marcos] of Object.entries(marcosPorDia)) {
    if (marcos.includes("inicio_ano")) inicioAno = key;
    if (marcos.includes("fim_ano")) fimAno = key;
  }

  const dias = {};
  const inicio = new Date(ano, 0, 1);
  const fim = new Date(ano, 11, 31);
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const data = new Date(d);
    const key = dateKey(data);
    const wd = pyWeekday(data); // 0=Seg..6=Dom
    const override = overrides[key];

    let tipo, contaComo, rotulo;
    if (override && override.tipo) {
      tipo = override.tipo;
      rotulo = override.rotulo || null;
      if (override.contaComo != null) {
        contaComo = override.contaComo;
      } else if (tipo === "letivo" || tipo === "recuperacao") {
        // recuperação sempre conta como dia letivo
        contaComo = wd;
      } else {
        // sábado letivo/substituição sem dia definido, feriado, recesso, férias,
        // exame, fora: não contam como letivo por padrão — precisam de contaComo
        // explícito (dia da semana escolhido) para contar.
        contaComo = null;
      }
    } else if (feriados.has(key)) {
      tipo = "feriado";
      contaComo = null;
      rotulo = feriados.get(key);
    } else if (inicioAno && fimAno && (key < inicioAno || key > fimAno)) {
      tipo = "fora";
      contaComo = null;
      rotulo = null;
    } else if (wd >= 5) {
      tipo = "fora";
      contaComo = null;
      rotulo = null;
    } else {
      tipo = "letivo";
      contaComo = wd;
      rotulo = null;
    }

    dias[key] = { tipo, contaComo, rotulo, marcos: marcosPorDia[key] || [], temOverride: !!override };
  }
  return dias;
}
