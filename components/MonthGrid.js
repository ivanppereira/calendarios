"use client";

import { MESES_PT, DOM_SEG_TER, TIPOS, dateKey } from "../lib/constants";
import { semanasDoMes, agruparNotas } from "../lib/calendarGrid";

export default function MonthGrid({ ano, mes, dias, onDayMouseDown, onDayMouseEnter, anotacoesPorDia }) {
  const semanas = semanasDoMes(ano, mes);
  let contadorLetivos = 0;
  const eventosDia = [];

  const celulas = [];
  semanas.forEach((semana, si) => {
    semana.forEach((data, di) => {
      const inMonth = data.getMonth() === mes - 1;
      if (!inMonth) {
        celulas.push(<div className="day-cell out" key={`${si}-${di}`} />);
        return;
      }
      const key = dateKey(data);
      const info = dias[key] || { tipo: "fora" };
      const t = TIPOS[info.tipo] || TIPOS.letivo;
      if (["letivo", "recuperacao", "substituicao", "sabado_letivo"].includes(info.tipo)) contadorLetivos += 1;
      if (info.rotulo) eventosDia.push([data.getDate(), info.rotulo]);
      const marcado = info.marcos && info.marcos.length > 0;
      const temAnotacao = anotacoesPorDia && anotacoesPorDia.has(key);
      celulas.push(
        <button
          key={key}
          type="button"
          className={"day-cell" + (marcado ? " marked" : "") + (temAnotacao ? " annotated" : "")}
          style={{ background: t.cor, color: t.texto }}
          onMouseDown={() => onDayMouseDown(key)}
          onMouseEnter={() => onDayMouseEnter(key)}
          onDragStart={(e) => e.preventDefault()}
          title={info.rotulo ? `${data.getDate()} — ${info.rotulo}` : t.label}
        >
          {data.getDate()}
          {marcado && <span className="marker-dot" />}
          {temAnotacao && <span className="annotation-dot" />}
        </button>
      );
    });
  });

  const notas = agruparNotas(eventosDia);

  return (
    <div className="month-card">
      <div className="month-title">{MESES_PT[mes - 1]} <span>{ano}</span></div>
      <div className="month-grid">
        {DOM_SEG_TER.map((d) => (
          <div className="weekday-head" key={d}>{d}</div>
        ))}
        {celulas}
      </div>
      <div className="month-counter">
        <span>Dias letivos</span>
        <strong>{contadorLetivos}</strong>
      </div>
      {notas.length > 0 && (
        <ul className="month-notes">
          {notas.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
