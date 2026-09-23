"use client";

import { MESES_PT, DOM_SEG_TER, TIPOS, DIAS_SEMANA_PT, CONFIG_TIPO, dateKey } from "../lib/constants";
import { semanasDoMes, agruparNotas } from "../lib/calendarGrid";

export default function MonthGrid({ ano, mes, dias, tipoCalendario, atividades = [], onDayMouseDown, onDayMouseEnter, anotacoesPorDia }) {
  const semanas = semanasDoMes(ano, mes);
  let contadorLetivos = 0;
  const eventosDia = [];

  const cfg = CONFIG_TIPO[tipoCalendario] || CONFIG_TIPO.superior;

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

      const temMarco = info.marcos && info.marcos.length > 0;
      const temMarcoPeriodo = temMarco && info.marcos.some(m => m.startsWith("inicio_periodo_") || m.startsWith("fim_periodo_") || m === "inicio_ano" || m === "fim_ano");

      // Cor da célula: se for início/fim de período, pinta de #81D41A
      const bgCor = temMarcoPeriodo ? "#81D41A" : t.cor;
      const textCor = temMarcoPeriodo ? "#16294a" : t.texto;

      // Coletar observações para o rodapé
      if (info.rotulo) {
        eventosDia.push([data.getDate(), info.rotulo]);
      } else if (info.tipo === "sabado_letivo") {
        const dSemana = info.contaComo != null ? ` (${DIAS_SEMANA_PT[info.contaComo]}-feira)` : "";
        eventosDia.push([data.getDate(), `Sábado letivo${dSemana}`]);
      } else if (info.tipo === "substituicao") {
        const dSemana = info.contaComo != null ? ` (${DIAS_SEMANA_PT[info.contaComo]}-feira)` : "";
        eventosDia.push([data.getDate(), `Substituição${dSemana}`]);
      } else if (info.tipo === "exame") {
        eventosDia.push([data.getDate(), "Exame Final"]);
      } else if (info.tipo === "recuperacao") {
        eventosDia.push([data.getDate(), "Recuperação"]);
      } else if (info.tipo === "recesso") {
        eventosDia.push([data.getDate(), "Recesso Acadêmico"]);
      } else if (info.tipo === "conselho") {
        eventosDia.push([data.getDate(), info.rotulo || "Conselho de Classe"]);
      }

      if (temMarco) {
        for (const m of info.marcos) {
          if (m === "inicio_ano") eventosDia.push([data.getDate(), "Início do ano letivo"]);
          else if (m === "fim_ano") eventosDia.push([data.getDate(), "Fim do ano letivo"]);
          else if (m.startsWith("inicio_periodo_")) {
            const idx = parseInt(m.replace("inicio_periodo_", ""), 10);
            const nomeP = cfg.nomesPeriodo[idx] || `${idx + 1}º Período`;
            eventosDia.push([data.getDate(), `Início do ${nomeP}`]);
          } else if (m.startsWith("fim_periodo_")) {
            const idx = parseInt(m.replace("fim_periodo_", ""), 10);
            const nomeP = cfg.nomesPeriodo[idx] || `${idx + 1}º Período`;
            eventosDia.push([data.getDate(), `Fim do ${nomeP}`]);
          }
        }
      }

      // Adicionar atividades que recaem sobre este dia
      if (atividades && atividades.length > 0) {
        for (const atv of atividades) {
          if (key >= atv.dataInicio && key <= (atv.dataFim || atv.dataInicio)) {
            eventosDia.push([data.getDate(), atv.desc || atv.categoria]);
          }
        }
      }

      const temAnotacao = anotacoesPorDia && anotacoesPorDia.has(key);

      celulas.push(
        <button
          key={key}
          type="button"
          className={"day-cell" + (temMarcoPeriodo ? " has-flags" : "") + (temAnotacao ? " annotated" : "")}
          style={{ background: bgCor, color: textCor }}
          onMouseDown={() => onDayMouseDown(key)}
          onMouseEnter={() => onDayMouseEnter(key)}
          onDragStart={(e) => e.preventDefault()}
          title={info.rotulo ? `${data.getDate()} — ${info.rotulo}` : t.label}
        >
          <span className="day-number">{data.getDate()}</span>
          {temMarco && (
            <div className="antigravity-flags-container">
              {info.marcos.map((m) => {
                if (m.startsWith("inicio_periodo_")) {
                  const idx = parseInt(m.replace("inicio_periodo_", ""), 10) + 1;
                  return (
                    <span key={m} className="antigravity-flag-badge start-flag" title={`Início do ${idx}º Bimestre`}>
                      <span className="fa-stack fa-xs">
                        <i className="fa-solid fa-flag fa-stack-2x flag-icon"></i>
                        <strong className="fa-stack-1x flag-number">{idx}</strong>
                      </span>
                    </span>
                  );
                }
                if (m.startsWith("fim_periodo_")) {
                  const idx = parseInt(m.replace("fim_periodo_", ""), 10) + 1;
                  return (
                    <span key={m} className="antigravity-flag-badge end-flag" title={`Fim do ${idx}º Bimestre`}>
                      <span className="fa-stack fa-xs">
                        <i className="fa-solid fa-flag-checkered fa-stack-2x flag-icon"></i>
                        <strong className="fa-stack-1x flag-number">{idx}</strong>
                      </span>
                    </span>
                  );
                }
                if (m === "inicio_ano") {
                  return (
                    <span key={m} className="antigravity-flag-badge start-flag" title="Início do Ano Letivo">
                      <i className="fa-solid fa-play flag-icon-small"></i>
                    </span>
                  );
                }
                if (m === "fim_ano") {
                  return (
                    <span key={m} className="antigravity-flag-badge end-flag" title="Fim do Ano Letivo">
                      <i className="fa-solid fa-stop flag-icon-small"></i>
                    </span>
                  );
                }
                return null;
              })}
            </div>
          )}
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
          {notas.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
