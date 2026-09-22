// Cálculo de feriados nacionais (fixos + móveis a partir da Páscoa).
// Portado do gerador Python (mesmo algoritmo de Gauss/Meeus) para uso no navegador.

export function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Retorna um Map<"YYYY-MM-DD", nome> com os feriados nacionais do ano informado.
export function feriadosNacionais(ano) {
  const p = pascoa(ano);
  const lista = [
    [new Date(ano, 0, 1), "Confraternização Universal"],
    [new Date(ano, 3, 21), "Tiradentes"],
    [new Date(ano, 4, 1), "Dia do Trabalho"],
    [new Date(ano, 8, 7), "Independência do Brasil"],
    [new Date(ano, 9, 12), "Nossa Senhora Aparecida"],
    [new Date(ano, 10, 2), "Finados"],
    [new Date(ano, 10, 15), "Proclamação da República"],
    [new Date(ano, 10, 20), "Dia Nacional de Zumbi e da Consciência Negra"],
    [new Date(ano, 11, 25), "Natal"],
    [addDays(p, -48), "Carnaval (Segunda-feira)"],
    [addDays(p, -47), "Carnaval (Terça-feira)"],
    [addDays(p, -2), "Sexta-feira Santa (Paixão de Cristo)"],
    [addDays(p, 60), "Corpus Christi"],
  ];
  const mapa = new Map();
  for (const [data, nome] of lista) {
    const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    mapa.set(key, nome);
  }
  return mapa;
}
