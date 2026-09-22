import {
  DIAS_SEMANA_PT, TIPOS_LETIVOS, META_POR_DIA_SEMANA, META_FERIAS_DOCENTES,
  CONFIG_TIPO, metasIndividuais,
} from "./constants";

function fmt(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// dias: { "YYYY-MM-DD": { tipo, contaComo (0-4|null), rotulo, marcos: string[] } }
// marcos possíveis por dia: "inicio_ano", "fim_ano", "inicio_periodo_N", "fim_periodo_N"
// (um mesmo dia pode ter vários marcos ao mesmo tempo, ex.: início do ano letivo E início do 1º período)
// atividades: [{ categoria, dataInicio, dataFim, desc, contaComoLetivo }] — prazos/eventos administrativos
export function validarCalendario(dias, tipoCalendario, atividades = []) {
  const cfg = CONFIG_TIPO[tipoCalendario];
  const metasInd = metasIndividuais(tipoCalendario);
  const isTecnico = tipoCalendario !== "superior";
  const checklist = [];

  // ---- marcos: primeira data (cronológica) em que cada marco aparece ----
  const marcos = {};
  for (const [key, info] of Object.entries(dias)) {
    for (const m of info.marcos || []) {
      if (!marcos[m] || key < marcos[m]) marcos[m] = key;
    }
  }
  const inicioAno = marcos["inicio_ano"] || null;
  const fimAno = marcos["fim_ano"] || null;

  // ---- contagem geral (ano todo) ----
  const contagemGeral = [0, 0, 0, 0, 0];
  let feriasTotal = 0;
  let total = 0;
  for (const info of Object.values(dias)) {
    if (info.tipo === "ferias") feriasTotal += 1;
    if (TIPOS_LETIVOS.has(info.tipo) && info.contaComo != null) {
      contagemGeral[info.contaComo] += 1;
      total += 1;
    }
  }

  checklist.push({
    ok: total >= META_POR_DIA_SEMANA * 5,
    grupo: "Resumo geral",
    msg: `Total de dias letivos no ano: ${total} (mínimo ${META_POR_DIA_SEMANA * 5})`,
  });
  for (let wd = 0; wd < 5; wd++) {
    const c = contagemGeral[wd];
    const ok = c >= META_POR_DIA_SEMANA;
    checklist.push({
      ok, grupo: "Resumo geral",
      msg: ok
        ? `${DIAS_SEMANA_PT[wd]}-feira: ${c} dias letivos no ano (mínimo ${META_POR_DIA_SEMANA})`
        : `${DIAS_SEMANA_PT[wd]}-feira: ${c}/${META_POR_DIA_SEMANA} dias letivos no ano — faltam ${META_POR_DIA_SEMANA - c}`,
    });
  }

  // ---- monta os períodos (datas + contagem por dia da semana dentro do intervalo) ----
  const periodos = cfg.nomesPeriodo.map((nome, i) => {
    const inicio = marcos[`inicio_periodo_${i}`] || null;
    const fim = marcos[`fim_periodo_${i}`] || null;
    const meta = metasInd[i];
    const contagem = [0, 0, 0, 0, 0];
    let diasContados = null;
    if (inicio && fim) {
      diasContados = 0;
      for (const [key, info] of Object.entries(dias)) {
        if (key < inicio || key > fim) continue;
        if (TIPOS_LETIVOS.has(info.tipo) && info.contaComo != null) {
          contagem[info.contaComo] += 1;
          diasContados += 1;
        }
      }
    }
    return { indice: i, nome, meta, inicio, fim, dias: diasContados, contagem };
  });

  for (const p of periodos) {
    if (!p.inicio || !p.fim) {
      checklist.push({
        ok: false, grupo: p.nome,
        msg: `${p.nome}: marque o início e o fim no calendário (ideal: ${p.meta} dias letivos)`,
      });
      continue;
    }
    const okTotal = p.dias >= p.meta;
    checklist.push({
      ok: okTotal, grupo: p.nome,
      msg: okTotal
        ? `${p.nome}: ${p.dias} dias letivos — ideal ${p.meta} (${fmt(p.inicio)} a ${fmt(p.fim)})`
        : `${p.nome}: ${p.dias}/${p.meta} dias letivos — faltam ${p.meta - p.dias} (${fmt(p.inicio)} a ${fmt(p.fim)})`,
    });

    const idealWd = Math.round(p.meta / 5);
    for (let wd = 0; wd < 5; wd++) {
      const c = p.contagem[wd];
      const ok = c >= idealWd;
      checklist.push({
        ok, grupo: p.nome,
        msg: ok
          ? `${p.nome} — ${DIAS_SEMANA_PT[wd]}-feira: ${c} dias (ideal ${idealWd})`
          : `${p.nome} — ${DIAS_SEMANA_PT[wd]}-feira: ${c}/${idealWd} — faltam ${idealWd - c} dia(s)`,
      });
    }
  }

  // ---- consistência entre períodos: não podem se sobrepor nem ficar fora de ordem ----
  for (const p of periodos) {
    if (p.inicio && p.fim && p.inicio > p.fim) {
      checklist.push({
        ok: false, grupo: "Consistência dos períodos",
        msg: `${p.nome}: a data de início (${fmt(p.inicio)}) é depois da data de fim (${fmt(p.fim)}).`,
      });
    }
  }
  for (let i = 0; i < periodos.length - 1; i++) {
    const a = periodos[i];
    const b = periodos[i + 1];
    if (a.fim && b.inicio && a.fim > b.inicio) {
      checklist.push({
        ok: false, grupo: "Consistência dos períodos",
        msg: `${a.nome} (termina em ${fmt(a.fim)}) se sobrepõe ao ${b.nome} (começa em ${fmt(b.inicio)}) `
          + "— um período não pode começar antes do anterior terminar.",
      });
    }
  }
  const primeiro = periodos[0];
  const ultimo = periodos[periodos.length - 1];
  if (inicioAno && primeiro.inicio && inicioAno > primeiro.inicio) {
    checklist.push({
      ok: false, grupo: "Consistência dos períodos",
      msg: `O início do ano letivo (${fmt(inicioAno)}) é depois do início do ${primeiro.nome} (${fmt(primeiro.inicio)}).`,
    });
  }
  if (fimAno && ultimo.fim && fimAno < ultimo.fim) {
    checklist.push({
      ok: false, grupo: "Consistência dos períodos",
      msg: `O fim do ano letivo (${fmt(fimAno)}) é antes do fim do ${ultimo.nome} (${fmt(ultimo.fim)}).`,
    });
  }

  // ---- ano letivo: marcos de início/fim (podem coincidir com início/fim de período) ----
  checklist.push({
    ok: !!(inicioAno && fimAno),
    grupo: "Ano letivo",
    msg: inicioAno && fimAno
      ? `Ano letivo: ${fmt(inicioAno)} a ${fmt(fimAno)}`
      : "Marque o início e o fim do ano letivo (pode ser no mesmo dia do início/fim de um período — marque as duas opções).",
  });

  // ---- férias docentes: exatamente 45 dias corridos ----
  const okFerias = feriasTotal === META_FERIAS_DOCENTES;
  checklist.push({
    ok: okFerias,
    grupo: "Férias docentes",
    msg: okFerias
      ? `Férias docentes: ${feriasTotal}/${META_FERIAS_DOCENTES} dias corridos`
      : `Férias docentes: ${feriasTotal}/${META_FERIAS_DOCENTES} dias corridos — `
        + (feriasTotal < META_FERIAS_DOCENTES ? `faltam ${META_FERIAS_DOCENTES - feriasTotal}` : `${feriasTotal - META_FERIAS_DOCENTES} a mais que o previsto`),
  });

  // ---- exame final: obrigatório ao final de cada semestre (superior) ou ao final do ano (técnico) ----
  const diasExame = Object.keys(dias).filter((k) => dias[k].tipo === "exame").sort();
  const existeExameEm = (depoisDe, antesDe) =>
    diasExame.some((k) => k > depoisDe && (!antesDe || k < antesDe));

  if (!isTecnico) {
    periodos.forEach((p, i) => {
      if (!p.fim) return; // já sinalizado acima como pendência de marco
      const proximoInicio = i < periodos.length - 1 ? periodos[i + 1].inicio : null;
      const ok = existeExameEm(p.fim, proximoInicio);
      checklist.push({
        ok, grupo: p.nome,
        msg: ok
          ? `${p.nome}: inclui dia(s) de Exame Final ao final do período`
          : `${p.nome}: falta incluir dia(s) de Exame Final após o término (${fmt(p.fim)})`,
      });
    });
  } else if (ultimo.fim) {
    const ok = existeExameEm(ultimo.fim, null);
    checklist.push({
      ok, grupo: "Exame Final",
      msg: ok
        ? "Inclui dia(s) de Exame Final ao final do ano letivo"
        : `Falta incluir dia(s) de Exame Final após o término do ${ultimo.nome} (${fmt(ultimo.fim)})`,
    });
  }

  // ---- recuperação: obrigatória nos cursos técnicos, deve cair dentro de algum período,
  //      e sempre conta como dia letivo. ----
  let diasRecuperacao = [];
  if (isTecnico) {
    diasRecuperacao = Object.keys(dias).filter((k) => dias[k].tipo === "recuperacao").sort();
    const okTemRecuperacao = diasRecuperacao.length > 0;
    checklist.push({
      ok: okTemRecuperacao,
      grupo: "Recuperação",
      msg: okTemRecuperacao
        ? `${diasRecuperacao.length} dia(s) de Recuperação incluído(s) (conta como letivo)`
        : "Inclua ao menos um dia de Recuperação (conta como letivo) — obrigatório nos cursos técnicos.",
    });
    const periodosDefinidos = periodos.every((p) => p.inicio && p.fim);
    if (okTemRecuperacao && periodosDefinidos) {
      const foraDoPeriodo = diasRecuperacao.filter((k) => !periodos.some((p) => k >= p.inicio && k <= p.fim));
      checklist.push({
        ok: foraDoPeriodo.length === 0,
        grupo: "Recuperação",
        msg: foraDoPeriodo.length === 0
          ? "Todos os dias de Recuperação estão dentro de algum período letivo"
          : `Dia(s) de Recuperação fora de qualquer período letivo: ${foraDoPeriodo.map(fmt).join(", ")}`,
      });
    }
  }

  // ---- Conselho de Classe Final: obrigatório informar, ao final de cada semestre (superior)
  //      ou ao final do ano letivo (técnico) — nunca conta como dia letivo. ----
  const atividadesPorCategoria = (categoria) =>
    atividades.filter((a) => a.categoria === categoria && a.dataInicio);
  const existeAtividadeEm = (categoria, depoisDe, antesDe) =>
    atividadesPorCategoria(categoria).some((a) => a.dataInicio > depoisDe && (!antesDe || a.dataInicio < antesDe));

  if (!isTecnico) {
    periodos.forEach((p, i) => {
      if (!p.fim) return;
      const proximoInicio = i < periodos.length - 1 ? periodos[i + 1].inicio : null;
      const ok = existeAtividadeEm("conselho_final", p.fim, proximoInicio);
      checklist.push({
        ok, grupo: p.nome,
        msg: ok
          ? `${p.nome}: Conselho de Classe Final informado`
          : `${p.nome}: falta informar a data do Conselho de Classe Final após o término (${fmt(p.fim)})`,
      });
    });
  } else if (ultimo.fim) {
    const ok = existeAtividadeEm("conselho_final", ultimo.fim, null);
    checklist.push({
      ok, grupo: "Conselho de Classe Final",
      msg: ok
        ? "Conselho de Classe Final informado ao final do ano letivo"
        : `Falta informar a data do Conselho de Classe Final após o término do ${ultimo.nome} (${fmt(ultimo.fim)})`,
    });
  }

  // ---- Colação de grau: recomendação (não bloqueia) — até 31/08 para turmas do 2º semestre,
  //      por conta do prazo do ENADE junto ao INEP. ----
  const ano = inicioAno ? inicioAno.slice(0, 4) : (fimAno ? fimAno.slice(0, 4) : null);
  if (ano) {
    const prazoEnade = `${ano}-08-31`;
    for (const a of atividadesPorCategoria("colacao")) {
      const dentroDoPrazo = a.dataInicio <= prazoEnade;
      checklist.push({
        ok: dentroDoPrazo,
        informativo: true,
        grupo: "Colação de Grau",
        msg: dentroDoPrazo
          ? `Colação de grau em ${fmt(a.dataInicio)} — dentro do prazo recomendado (até 31/08)`
          : `Colação de grau em ${fmt(a.dataInicio)} — recomenda-se até 31/08 para regularização no ENADE (INEP), se for referente ao 2º semestre`,
      });
    }
  }

  const ok = checklist.filter((c) => !c.informativo).every((c) => c.ok);
  return {
    ok, checklist, contagem: contagemGeral, total, periodos, feriasTotal, marcos, inicioAno, fimAno,
    diasExame, diasRecuperacao,
  };
}
