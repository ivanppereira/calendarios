"use client";

import { useState } from "react";
import { TIPOS, DIAS_SEMANA_PT, CONFIG_TIPO, CATEGORIAS_ATIVIDADE, categoriaInfo } from "../lib/constants";

// Ícones FontAwesome para cada classificação de dia
const ICONS_TIPO = {
  letivo: "fa-solid fa-calendar-check",
  recuperacao: "fa-solid fa-rotate-left",
  substituicao: "fa-solid fa-arrow-right-arrow-left",
  feriado: "fa-solid fa-sun",
  recesso: "fa-solid fa-mug-hot",
  ferias: "fa-solid fa-umbrella-beach",
  sabado_letivo: "fa-solid fa-calendar-plus",
  exame: "fa-solid fa-graduation-cap",
  conselho: "fa-solid fa-users-rectangle",
};

export default function Toolbar({ ferramentaAtiva, onSelecionar, tipoCalendario }) {
  const cfg = CONFIG_TIPO[tipoCalendario] || CONFIG_TIPO.superior;
  const [categoriaPrompt, setCategoriaPrompt] = useState("evento");
  const [textoPrompt, setTextoPrompt] = useState("");
  const [contaComoLetivoPrompt, setContaComoLetivoPrompt] = useState(false);
  const [promptAberto, setPromptAberto] = useState(false);

  const tipoAtivoKey = ferramentaAtiva?.kind === "tipo" ? ferramentaAtiva.tipo : null;
  const marcoAtivoKey = ferramentaAtiva?.kind === "marco" ? ferramentaAtiva.marco : null;
  const atividadeAtiva = ferramentaAtiva?.kind === "atividade" ? ferramentaAtiva : null;

  function clicarTipo(key) {
    if (tipoAtivoKey === key) {
      onSelecionar(null);
      return;
    }
    if (key === "sabado_letivo" || key === "substituicao") {
      onSelecionar({ kind: "tipo", tipo: key, contaComo: 0 });
    } else {
      onSelecionar({ kind: "tipo", tipo: key, contaComo: null });
    }
  }

  function mudarContaComo(valor) {
    onSelecionar({ ...ferramentaAtiva, contaComo: Number(valor) });
  }

  function clicarMarco(key) {
    if (marcoAtivoKey === key) {
      onSelecionar(null);
      return;
    }
    onSelecionar({ kind: "marco", marco: key });
  }

  function abrirPromptAtividade() {
    if (atividadeAtiva) {
      onSelecionar(null);
      setPromptAberto(false);
      return;
    }
    setPromptAberto(true);
    setTextoPrompt("");
    setContaComoLetivoPrompt(false);
  }

  function confirmarAtividade() {
    onSelecionar({
      kind: "atividade",
      categoria: categoriaPrompt,
      descricao: textoPrompt.trim(),
      contaComoLetivo: categoriaInfo(categoriaPrompt).contaComoLetivoDisponivel ? contaComoLetivoPrompt : false,
    });
    setPromptAberto(false);
  }

  // Filtrar o tipo "fora" (removido a pedido da especificação 8)
  const tiposExibicao = Object.entries(TIPOS).filter(([k]) => k !== "fora");

  return (
    <aside className="sketchup-toolbar">
      <div className="sketchup-header">
        <span>Ferramentas</span>
        {ferramentaAtiva && (
          <button
            type="button"
            className="sketchup-btn-clear"
            onClick={() => onSelecionar(null)}
            title="Parar de marcar / Limpar ferramenta"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      <div className="sketchup-section-label">Classificar</div>
      <div className="sketchup-grid">
        {tiposExibicao.map(([k, t]) => {
          const isActive = tipoAtivoKey === k;
          return (
            <button
              key={k}
              type="button"
              className={"sketchup-btn" + (isActive ? " active" : "")}
              style={{
                background: t.cor,
                color: t.texto,
                border: isActive ? "2px solid var(--gold)" : "1px solid rgba(0,0,0,0.15)",
              }}
              onClick={() => clicarTipo(k)}
              title={`${t.label} — Clique e arraste para aplicar nos dias`}
            >
              <i className={ICONS_TIPO[k] || "fa-solid fa-pen"}></i>
            </button>
          );
        })}
      </div>

      {(tipoAtivoKey === "sabado_letivo" || tipoAtivoKey === "substituicao") && (
        <div className="sketchup-sub-box">
          <label className="sketchup-label">Refere-se a:</label>
          <select value={ferramentaAtiva.contaComo ?? 0} onChange={(e) => mudarContaComo(e.target.value)}>
            {DIAS_SEMANA_PT.slice(0, 5).map((nome, i) => (
              <option key={i} value={i}>{nome}-feira</option>
            ))}
          </select>
        </div>
      )}

      <div className="sketchup-section-label">Marcos (Início / Fim)</div>
      <div className="sketchup-grid">
        <button
          type="button"
          className={"sketchup-btn btn-outline" + (marcoAtivoKey === "inicio_ano" ? " active" : "")}
          onClick={() => clicarMarco("inicio_ano")}
          title="Início do ano letivo"
        >
          <i className="fa-solid fa-play"></i>
        </button>
        <button
          type="button"
          className={"sketchup-btn btn-outline" + (marcoAtivoKey === "fim_ano" ? " active" : "")}
          onClick={() => clicarMarco("fim_ano")}
          title="Fim do ano letivo"
        >
          <i className="fa-solid fa-stop"></i>
        </button>

        {cfg.nomesPeriodo.map((nome, i) => (
          <div key={`periodo-row-${i}`} className="sketchup-grid-row">
            <button
              type="button"
              className={"sketchup-btn btn-outline btn-flag-start" + (marcoAtivoKey === `inicio_periodo_${i}` ? " active" : "")}
              onClick={() => clicarMarco(`inicio_periodo_${i}`)}
              title={`Início: ${nome}`}
            >
              <span className="fa-stack fa-2xs">
                <i className="fa-solid fa-flag fa-stack-2x"></i>
                <strong className="fa-stack-1x stack-num">{i + 1}</strong>
              </span>
            </button>
            <button
              type="button"
              className={"sketchup-btn btn-outline btn-flag-end" + (marcoAtivoKey === `fim_periodo_${i}` ? " active" : "")}
              onClick={() => clicarMarco(`fim_periodo_${i}`)}
              title={`Fim: ${nome}`}
            >
              <span className="fa-stack fa-2xs">
                <i className="fa-solid fa-flag-checkered fa-stack-2x"></i>
                <strong className="fa-stack-1x stack-num">{i + 1}</strong>
              </span>
            </button>
          </div>
        ))}
      </div>

      <div className="sketchup-section-label">Atividade</div>
      <div className="sketchup-grid">
        <button
          type="button"
          className={"sketchup-btn btn-outline" + (atividadeAtiva ? " active" : "")}
          onClick={abrirPromptAtividade}
          title={atividadeAtiva ? `Atividade: ${atividadeAtiva.descricao || atividadeAtiva.categoria}` : "Marcar evento / conselho / reunião..."}
        >
          <i className="fa-solid fa-clipboard-list"></i>
        </button>
      </div>

      {promptAberto && (
        <div className="sketchup-prompt-popover">
          <h5>Marcar Atividade</h5>
          <select value={categoriaPrompt} onChange={(e) => setCategoriaPrompt(e.target.value)}>
            {CATEGORIAS_ATIVIDADE.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={textoPrompt}
            onChange={(e) => setTextoPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmarAtividade(); if (e.key === "Escape") setPromptAberto(false); }}
            placeholder="Descrição (opcional)"
          />
          {categoriaInfo(categoriaPrompt).contaComoLetivoDisponivel && (
            <label className="toolbar-inline-select">
              <input type="checkbox" checked={contaComoLetivoPrompt}
                onChange={(e) => setContaComoLetivoPrompt(e.target.checked)} />
              <span>Conta como letivo</span>
            </label>
          )}
          <button className="btn btn-primary btn-sm" onClick={confirmarAtividade}>Marcar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPromptAberto(false)}>Cancelar</button>
        </div>
      )}

      {ferramentaAtiva && (
        <div className="sketchup-active-hint">
          {ferramentaAtiva.kind === "tipo" && (TIPOS[ferramentaAtiva.tipo]?.label || ferramentaAtiva.tipo)}
          {ferramentaAtiva.kind === "marco" && "Marco de Período"}
          {ferramentaAtiva.kind === "atividade" && "Atividade / Evento"}
        </div>
      )}
    </aside>
  );
}
