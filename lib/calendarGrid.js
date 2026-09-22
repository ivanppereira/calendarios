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

// Agrupa uma lista [(dia, rotulo)] em faixas contínuas com o mesmo rótulo,
// ex.: [(1,'Férias'),(2,'Férias')] -> ["01 a 02 - Férias"]
export function agruparNotas(eventosDia) {
  const ordenado = [...eventosDia].sort((a, b) => a[0] - b[0]);
  const notas = [];
  let idx = 0;
  while (idx < ordenado.length) {
    const [diaIni, rot] = ordenado[idx];
    let diaFim = diaIni;
    let j = idx + 1;
    while (j < ordenado.length && ordenado[j][1] === rot && ordenado[j][0] === diaFim + 1) {
      diaFim = ordenado[j][0];
      j += 1;
    }
    notas.push(diaFim > diaIni
      ? `${String(diaIni).padStart(2, "0")} a ${String(diaFim).padStart(2, "0")} - ${rot}`
      : `${String(diaIni).padStart(2, "0")} - ${rot}`);
    idx = j;
  }
  return notas;
}
