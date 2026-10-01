const SEMANAS_POR_MES = 6;

// Gera sempre 6 semanas (domingo a sábado) cobrindo o mês, preenchendo com dias
// do mês seguinte quando necessário — assim toda grade de mês tem o mesmo tamanho.
export function semanasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes - 1, 1);
  const inicioGrade = new Date(primeiro);
  inicioGrade.setDate(primeiro.getDate() - primeiro.getDay());

  const semanas = [];
  let cursor = new Date(inicioGrade);
  while (true) {
    const semana = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
    if (semana[6].getMonth() !== mes - 1 && semana[6] > primeiro) break;
    if (semanas.length > 8) break; // segurança
  }
  while (semanas.length < SEMANAS_POR_MES) {
    const semana = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
  }
  return semanas.slice(0, SEMANAS_POR_MES);
}

function eFimDeSemana(ano, mes, dia) {
  if (!ano || !mes) return false;
  const data = new Date(ano, mes - 1, dia);
  const wd = data.getDay(); // 0=Dom, 6=Sáb
  return wd === 0 || wd === 6;
}

function apenasFimDeSemanaEntre(ano, mes, dia1, dia2) {
  if (dia2 - dia1 <= 1) return true;
  if (!ano || !mes) return false;
  for (let d = dia1 + 1; d < dia2; d++) {
    if (!eFimDeSemana(ano, mes, d)) return false;
  }
  return true;
}

// Agrupa uma lista [(dia, rotulo)] em faixas contínuas com o mesmo rótulo,
// ex.: [(17,'Conselho'), (18,'Conselho'), ..., (25,'Conselho')] -> ["17 a 25 - Conselho"]
export function agruparNotas(eventosDia, ano, mes) {
  if (!eventosDia || eventosDia.length === 0) return [];

  // Deduplicar pares (dia, rotulo)
  const mapaUnicos = new Map();
  for (const [dia, rot] of eventosDia) {
    if (rot == null || rot === "") continue;
    const rotLimpo = String(rot).trim();
    if (!rotLimpo) continue;
    const chave = `${dia}___${rotLimpo}`;
    if (!mapaUnicos.has(chave)) {
      mapaUnicos.set(chave, [Number(dia), rotLimpo]);
    }
  }

  // Agrupar dias por rótulo
  const porRotulo = new Map();
  for (const [dia, rot] of mapaUnicos.values()) {
    if (!porRotulo.has(rot)) {
      porRotulo.set(rot, []);
    }
    porRotulo.get(rot).push(dia);
  }

  const notas = [];

  // Para cada rótulo, agrupar faixas (dias consecutivos ou separados apenas por fim de semana)
  for (const [rot, dias] of porRotulo.entries()) {
    dias.sort((a, b) => a - b);
    let idx = 0;
    while (idx < dias.length) {
      const diaIni = dias[idx];
      let diaFim = diaIni;
      let j = idx + 1;
      while (j < dias.length) {
        const prox = dias[j];
        if (prox === diaFim + 1 || (ano && mes && apenasFimDeSemanaEntre(ano, mes, diaFim, prox))) {
          diaFim = prox;
          j += 1;
        } else {
          break;
        }
      }
      notas.push({
        diaIni,
        diaFim,
        rot,
        texto: diaFim > diaIni
          ? `${String(diaIni).padStart(2, "0")} a ${String(diaFim).padStart(2, "0")} - ${rot}`
          : `${String(diaIni).padStart(2, "0")} - ${rot}`
      });
      idx = j;
    }
  }

  // Ordenar a lista final pelo dia inicial de cada evento
  notas.sort((a, b) => a.diaIni - b.diaIni || a.diaFim - b.diaFim);
  return notas.map((n) => n.texto);
}
