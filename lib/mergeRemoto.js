// Aplica, por cima do estado local, só o que realmente mudou entre a versão
// antiga (old) e a nova (new) recebidas por um evento de Realtime — assim uma
// edição local em outro dia/campo que ainda não foi salva não é perdida.

function iguais(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Para objetos "dicionário" simples: overrides (por data) e marcos (por data).
export function mesclarDicionario(local, antigoRemoto, novoRemoto) {
  const oldObj = antigoRemoto || {};
  const newObj = novoRemoto || {};
  const chaves = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  let mudou = false;
  const mesclado = { ...local };
  for (const k of chaves) {
    const o = oldObj[k];
    const n = newObj[k];
    if (iguais(o, n)) continue; // não mudou remotamente, preserva o que tiver localmente
    mudou = true;
    if (n === undefined) delete mesclado[k];
    else mesclado[k] = n;
  }
  return { valor: mesclado, mudou };
}

// Para a lista de atividades (array de objetos com "id" único).
export function mesclarAtividades(local, antigoRemoto, novoRemoto) {
  const oldArr = antigoRemoto || [];
  const newArr = novoRemoto || [];
  const oldById = new Map(oldArr.map((a) => [a.id, a]));
  const newById = new Map(newArr.map((a) => [a.id, a]));
  let mudou = false;
  let mesclado = [...local];

  for (const id of oldById.keys()) {
    if (!newById.has(id)) {
      mudou = true;
      mesclado = mesclado.filter((a) => a.id !== id);
    }
  }
  for (const [id, item] of newById) {
    const antigo = oldById.get(id);
    if (antigo && iguais(antigo, item)) continue;
    mudou = true;
    const idx = mesclado.findIndex((a) => a.id === id);
    if (idx >= 0) mesclado[idx] = item;
    else mesclado.push(item);
  }
  return { valor: mesclado, mudou };
}

// Para campos simples (ano, tipo, campus, nome): só aplica se o valor
// realmente mudou remotamente (evita sobrescrever uma edição local no meio
// de uma digitação, por exemplo, quando o evento remoto é sobre outro campo).
export function mesclarEscalar(local, antigoRemoto, novoRemoto) {
  if (iguais(antigoRemoto, novoRemoto)) return { valor: local, mudou: false };
  return { valor: novoRemoto, mudou: true };
}
