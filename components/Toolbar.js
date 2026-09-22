"use client";

import { useState } from "react";
import { TIPOS, DIAS_SEMANA_PT, CONFIG_TIPO, CATEGORIAS_ATIVIDADE, categoriaInfo } from "../lib/constants";

export default function Toolbar({ ferramentaAtiva, onSelecionar, tipoCalendario }) {
  const cfg = CONFIG_TIPO[tipoCalendario];
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

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <span className="toolbar-label">Classificar:</span>
        <div className="toolbar-group">
          {Object.entries(TIPOS).map(([k, t]) => (
            <button
              key={k}
              type="button"
              className={"toolbar-chip" + (tipoAtivoKey === k ? " active" : "")}
              style={{ background: t.cor, color: t.texto, borderColor: tipoAtivoKey === k ? "var(--gold)" : "transparent" }}
              onClick={() => clicarTipo(k)}
              title={`Clique e arraste sobre os dias para marcar como "${t.label}"`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(tipoAtivoKey === "sabado_letivo" || tipoAtivoKey === "substituicao") && (
          <label className="toolbar-inline-select">
            <span>Refere-se a:</span>
            <select value={ferramentaAtiva.contaComo ?? 0} onChange={(e) => mudarContaComo(e.target.value)}>
              {DIAS_SEMANA_PT.slice(0, 5).map((nome, i) => (
                <option key={i} value={i}>{nome}-feira</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="toolbar-row">
        <span className="toolbar-label">Marcos:</span>
        <div className="toolbar-group">
          <button type="button" className={"toolbar-chip chip-outline" + (marcoAtivoKey === "inicio_ano" ? " active" : "")}
            onClick={() => clicarMarco("inicio_ano")}>Início do ano letivo</button>
          <button type="button" className={"toolbar-chip chip-outline" + (marcoAtivoKey === "fim_ano" ? " active" : "")}
            onClick={() => clicarMarco("fim_ano")}>Fim do ano letivo</button>
          {cfg.nomesPeriodo.map((nome, i) => (
            <button key={`ini-${i}`} type="button"
              className={"toolbar-chip chip-outline" + (marcoAtivoKey === `inicio_periodo_${i}` ? " active" : "")}
              onClick={() => clicarMarco(`inicio_periodo_${i}`)}>Início {nome}</button>
          ))}
          {cfg.nomesPeriodo.map((nome, i) => (
            <button key={`fim-${i}`} type="button"
              className={"toolbar-chip chip-outline" + (marcoAtivoKey === `fim_periodo_${i}` ? " active" : "")}
              onClick={() => clicarMarco(`fim_periodo_${i}`)}>Fim {nome}</button>
          ))}
        </div>
      </div>

      <div className="toolbar-row">
        <span className="toolbar-label">Atividades:</span>
        <div className="toolbar-group">
          <button type="button" className={"toolbar-chip chip-outline" + (atividadeAtiva ? " active" : "")}
            onClick={abrirPromptAtividade}>
            {atividadeAtiva
              ? `${categoriaInfo(atividadeAtiva.categoria).label}${atividadeAtiva.descricao ? `: "${atividadeAtiva.descricao}"` : ""}`
              : "Marcar prazo / evento / conselho..."}
          </button>
        </div>
        {ferramentaAtiva && (
          <button type="button" className="toolbar-clear" onClick={() => onSelecionar(null)}>
            ✕ Parar de marcar
          </button>
        )}
      </div>

      {promptAberto && (
        <div className="toolbar-prompt">
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
          <button className="btn btn-primary btn-sm" onClick={confirmarAtividade}>Usar e marcar dias</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPromptAberto(false)}>Cancelar</button>
        </div>
      )}

      {ferramentaAtiva && !promptAberto && (
        <p className="toolbar-hint">
          Ferramenta ativa — clique num dia para marcá-lo, ou clique e arraste sobre vários dias seguidos.
        </p>
      )}
    </div>
  );
}
