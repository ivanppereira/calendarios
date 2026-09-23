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
      <div className="period-summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--navy-dark)" }}>{periodo.nome}</h4>
        <span className="badge-sabados-total" style={{ background: "#e2f0d9", color: "#38761D", padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>
          Total de sábados letivos no período: {resumo.totalSabados || 0}
        </span>
      </div>
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
          <tr className="subtotal-row2" style={{ fontWeight: 700, background: "#f5f7fa" }}>
            <th className="row-label" style={{ color: "#38761D" }}>Total de Sábados</th>
            {resumo.totalPorMes.flatMap((m, i) => [
              <td key={`fc-${i}`}>-</td>,
              <td key={`fs-${i}`} style={{ fontWeight: 700, color: "#38761D" }}>{m.sabado || 0}</td>,
            ])}
            <td className="total-col" style={{ color: "#38761D" }}>{resumo.totalSabados || 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
