"use client";

const NOMES_DIA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

export default function PeriodSummaryTable({ periodo, resumo }) {
  if (!periodo.inicio || !periodo.fim || resumo.meses.length === 0) {
    return (
      <div className="period-summary empty">
        <h4>{periodo.nome}</h4>
        <p>Marque o início e o fim deste período no calendário para ver o resumo por mês.</p>
      </div>
    );
  }

  return (
    <div className="period-summary">
      <table className="period-summary-table">
        <thead>
          <tr>
            <th className="corner">{periodo.nome}</th>
            {resumo.mesesNomes.map((nome, i) => (
              <th key={`mes-${i}`} colSpan={2}>{nome}</th>
            ))}
            <th rowSpan={4} className="total-header">Dias<br />letivos</th>
          </tr>
          <tr className="subtotal-row">
            <th>{resumo.totalGeral} no total</th>
            {resumo.totalPorMes.map((m, i) => (
              <th key={`tot-${i}`} colSpan={2}>{m.total}</th>
            ))}
          </tr>
          <tr className="subtotal-row2">
            <th></th>
            {resumo.totalPorMes.flatMap((m, i) => [
              <td key={`c-${i}`}>{m.comum || ""}</td>,
              <td key={`s-${i}`}>{m.sabado || ""}</td>,
            ])}
          </tr>
          <tr>
            <th>Dia da semana</th>
            {resumo.mesesNomes.flatMap((_, i) => [
              <th key={`hc-${i}`} className="sub-header">Comum</th>,
              <th key={`hs-${i}`} className="sub-header">Sábado</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {resumo.porDiaSemana.map((linha) => (
            <tr key={linha.wd}>
              <th className="row-label">{NOMES_DIA[linha.wd]}</th>
              {linha.porMes.flatMap((c, i) => [
                <td key={`c-${i}`}>{c.comum || ""}</td>,
                <td key={`s-${i}`}>{c.sabado || ""}</td>,
              ])}
              <td className="total-col">{linha.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
