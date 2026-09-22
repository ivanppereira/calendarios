const INTERVALO_CHECKPOINT_MS = 5 * 60 * 1000; // 5 minutos

// Guarda um "checkpoint" do estado ANTERIOR (linhaAntiga) antes de aplicar uma
// atualização — assim o histórico permite voltar para como o calendário estava
// antes da mudança atual. O checkpoint é atribuído a quem de fato escreveu
// aquele conteúdo (linhaAntiga.ultimo_autor_*), não a quem está salvando agora.
// Só cria um novo checkpoint se: já existe algum autor anterior (não é a
// primeira edição), e (o autor mudou OU já passou tempo suficiente desde o
// último checkpoint) — evita lotar o histórico a cada autosave (~1s durante
// edição ativa).
//
// Retorna `true` se um checkpoint foi criado (o chamador deve então atualizar
// `ultima_versao_em` na linha principal), ou `false` caso contrário.
export async function talvezRegistrarVersao(supabase, calendarioId, linhaAntiga, novoAutorId) {
  try {
    const autorAnterior = linhaAntiga.ultimo_autor_id || null;
    if (!autorAnterior) return false; // primeira edição: nada de "antes" pra guardar ainda

    const agora = Date.now();
    const autorMudou = autorAnterior !== (novoAutorId || null);
    const ultimaVersaoEm = linhaAntiga.ultima_versao_em ? new Date(linhaAntiga.ultima_versao_em).getTime() : null;
    // só considera "tempo suficiente passou" se já existe alguma referência de
    // tempo (um checkpoint anterior de verdade) — sem isso, a única razão
    // válida para criar o primeiro checkpoint é a troca de autor
    const tempoPassou = ultimaVersaoEm !== null && (agora - ultimaVersaoEm) > INTERVALO_CHECKPOINT_MS;

    if (!autorMudou && !tempoPassou) return false;

    await supabase.from("calendario_versoes").insert({
      calendario_id: calendarioId,
      autor_id: autorAnterior,
      autor_nome: linhaAntiga.ultimo_autor_nome || "Anônimo",
      nome: linhaAntiga.nome,
      ano: linhaAntiga.ano,
      tipo: linhaAntiga.tipo,
      campus: linhaAntiga.campus,
      overrides: linhaAntiga.overrides,
      marcos: linhaAntiga.marcos,
      atividades: linhaAntiga.atividades,
      motivo: "autosave",
    });
    return true;
  } catch {
    // o histórico é um recurso auxiliar — uma falha aqui nunca deve impedir o
    // salvamento principal do calendário
    return false;
  }
}

// Ao restaurar uma versão antiga, guarda o estado ATUAL (de antes da
// restauração) como um novo checkpoint, atribuído a quem pediu a restauração —
// assim a restauração em si também pode ser desfeita depois.
export async function registrarVersaoRestauracao(supabase, calendarioId, linhaAtual, autorId, autorNome) {
  try {
    await supabase.from("calendario_versoes").insert({
      calendario_id: calendarioId,
      autor_id: autorId || null,
      autor_nome: autorNome || "Anônimo",
      nome: linhaAtual.nome,
      ano: linhaAtual.ano,
      tipo: linhaAtual.tipo,
      campus: linhaAtual.campus,
      overrides: linhaAtual.overrides,
      marcos: linhaAtual.marcos,
      atividades: linhaAtual.atividades,
      motivo: "restauracao",
    });
  } catch {
    // idem — não impede a restauração em si
  }
}
