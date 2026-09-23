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

export function calcularFimPeriodo(inicioKey, targetDias, overrides = {}, ano = new Date().getFullYear()) {
  if (!inicioKey || !targetDias) return null;
  const feriados = new Map([
    ...feriadosNacionais(ano - 1),
    ...feriadosNacionais(ano),
    ...feriadosNacionais(ano + 1),
  ]);

  let contador = 0;
  const [y, m, d] = inicioKey.split("-").map(Number);
  let cursor = new Date(y, m - 1, d);
  let limite = 365;

  while (limite > 0) {
    const key = dateKey(cursor);
    const wd = pyWeekday(cursor);
    const override = overrides[key];

    let ehLetivo = false;
    if (override && override.tipo) {
      if (["letivo", "recuperacao", "substituicao", "sabado_letivo"].includes(override.tipo)) {
        ehLetivo = true;
      }
    } else if (feriados.has(key)) {
      ehLetivo = false;
    } else if (wd < 5) {
      ehLetivo = true;
    }

    if (ehLetivo) {
      contador += 1;
      if (contador === targetDias) {
        return key;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
    limite -= 1;
  }
  return dateKey(cursor);
}

export function autoAjustarMarcos(marcosPorDia, overrides, ano, tipoCalendario, metasInd) {
  const nextMarcos = { ...marcosPorDia };

  // Localizar o início de cada período
  metasInd.forEach((targetMeta, idx) => {
    const tagInicio = `inicio_periodo_${idx}`;
    const tagFim = `fim_periodo_${idx}`;

    let inicioKey = null;
    for (const [key, arr] of Object.entries(nextMarcos)) {
      if (arr.includes(tagInicio)) {
        if (!inicioKey || key < inicioKey) inicioKey = key;
      }
    }

    if (inicioKey) {
      const novoFimKey = calcularFimPeriodo(inicioKey, targetMeta, overrides, ano);
      if (novoFimKey) {
        // Remover tagFim de onde quer que estivesse
        for (const [k, arr] of Object.entries(nextMarcos)) {
          if (arr.includes(tagFim)) {
            const filtrado = arr.filter((m) => m !== tagFim);
            if (filtrado.length > 0) nextMarcos[k] = filtrado;
            else delete nextMarcos[k];
          }
        }
        // Adicionar novoFimKey
        const atual = new Set(nextMarcos[novoFimKey] || []);
        atual.add(tagFim);
        nextMarcos[novoFimKey] = Array.from(atual);
      }
    }
  });

  return nextMarcos;
}
