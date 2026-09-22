"use client";

import { useState } from "react";
import {
  TIPOS, DIAS_SEMANA_PT, CONFIG_TIPO, keyToDate, pyWeekday,
  ESFERAS_FERIADO, CATEGORIAS_ATIVIDADE, categoriaInfo,
} from "../lib/constants";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatarData(key) {
  const d = keyToDate(key);
  const wd = DIAS_SEMANA_PT[(d.getDay() + 6) % 7];
  return `${wd}-feira, ${d.getDate()} de ${NOMES_MES[d.getMonth()]} de ${d.getFullYear()}`;
}

function traduzirMarco(m, cfg) {
  if (m === "inicio_ano") return "início do ano letivo";
  if (m === "fim_ano") return "fim do ano letivo";
  const iniMatch = m.match(/^inicio_periodo_(\d+)$/);
  if (iniMatch) return `início do ${cfg.nomesPeriodo[Number(iniMatch[1])]}`;
  const fimMatch = m.match(/^fim_periodo_(\d+)$/);
  if (fimMatch) return `fim do ${cfg.nomesPeriodo[Number(fimMatch[1])]}`;
  return m;
}

export default function DayPopover({ dateKey: key, info, tipoCalendario, onClose, onSave }) {
  const cfg = CONFIG_TIPO[tipoCalendario];
  const wdAtual = pyWeekday(keyToDate(key));
  const ehSabado = wdAtual === 5;

  // 'escolha' | 'classificacao' | 'marco' | 'atividade'
  const [passo, setPasso] = useState("escolha");
  const [tipoEscolhido, setTipoEscolhido] = useState(null);
  const [contaComo, setContaComo] = useState(info?.contaComo ?? "");
  const [esfera, setEsfera] = useState("municipal");
  const [rotulo, setRotulo] = useState(info?.rotulo || "");
  const [marcosSelecionados, setMarcosSelecionados] = useState(() => new Set(info?.marcos || []));
  const [categoriaAtividade, setCategoriaAtividade] = useState("evento");
  const [dataFimAtividade, setDataFimAtividade] = useState(key);
  const [descAtividade, setDescAtividade] = useState("");
  const [contaComoLetivoAtividade, setContaComoLetivoAtividade] = useState(false);

  const opcoesClassificacao = Object.entries(TIPOS).filter(([k]) => k !== "sabado_letivo" || ehSabado);

  function escolherClassificacao(k) {
    setTipoEscolhido(k);
    setContaComo(info?.tipo === k ? (info?.contaComo ?? "") : "");
    setRotulo(info?.tipo === k ? (info?.rotulo || "") : "");
    setPasso("classificacao");
  }

  function toggleMarco(chave) {
    setMarcosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }

  function handleSalvar() {
    if (passo === "classificacao") {
      let contaComoFinal = null;
      if (tipoEscolhido === "sabado_letivo" || tipoEscolhido === "substituicao") {
        contaComoFinal = contaComo === "" ? null : Number(contaComo);
      }
      // para "letivo" e "recuperacao", contaComo fica null aqui e o buildEffectiveDias
      // calcula automaticamente o dia da semana a partir da própria data.
      const rotuloFinal = tipoEscolhido === "feriado" && rotulo.trim()
        ? `[${ESFERAS_FERIADO.find((e) => e.key === esfera)?.label}] ${rotulo.trim()}`
        : (rotulo.trim() || null);
      onSave({
        tipo: tipoEscolhido,
        contaComo: contaComoFinal,
        rotulo: rotuloFinal,
        marcos: info?.marcos || [],
      });
    } else if (passo === "marco") {
      onSave({
        tipo: info?.tipo || "letivo",
        contaComo: info?.contaComo ?? null,
        rotulo: info?.rotulo || null,
        marcos: Array.from(marcosSelecionados),
      });
    } else if (passo === "atividade") {
      onSave({
        tipo: info?.tipo || "letivo",
        contaComo: info?.contaComo ?? null,
        rotulo: info?.rotulo || null,
        marcos: info?.marcos || [],
        addAtividade: {
          categoria: categoriaAtividade,
          dataInicio: key,
          dataFim: dataFimAtividade || key,
          desc: descAtividade.trim(),
          contaComoLetivo: categoriaInfo(categoriaAtividade).contaComoLetivoDisponivel ? contaComoLetivoAtividade : false,
        },
      });
    }
  }

  function handleRestaurarPadrao() {
    onSave({ limpar: true });
  }

  const statusAtual = TIPOS[info?.tipo]?.label || "—";
  const catAtividade = categoriaInfo(categoriaAtividade);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{formatarData(key)}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="modal-status">
          <span>Atual: <strong>{statusAtual}</strong>{info?.rotulo ? ` — "${info.rotulo}"` : ""}</span>
          {info?.marcos && info.marcos.length > 0 && (
            <span className="modal-status-marcos">
              Marcos: {info.marcos.map((m) => traduzirMarco(m, cfg)).join(", ")}
            </span>
          )}
        </div>

        {passo === "escolha" && (
          <div className="modal-body">
            <p className="escolha-hint">O que você quer fazer com este dia?</p>

            <div className="escolha-grupo">
              <h5>Classificação</h5>
              <div className="chips">
                {opcoesClassificacao.map(([k, t]) => (
                  <button key={k} type="button" className="chip"
                    style={{ background: t.cor, color: t.texto }}
                    onClick={() => escolherClassificacao(k)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="escolha-grupo">
              <h5>Marco de período</h5>
              <div className="chips">
                <button type="button" className="chip chip-outline" onClick={() => setPasso("marco")}>
                  Início / Fim de ano ou período
                </button>
              </div>
            </div>

            <div className="escolha-grupo">
              <h5>Atividades e prazos</h5>
              <div className="chips">
                <button type="button" className="chip chip-outline" onClick={() => setPasso("atividade")}>
                  Evento, matrícula, conselho, colação...
                </button>
              </div>
            </div>
          </div>
        )}

        {passo === "classificacao" && (
          <div className="modal-body">
            <button className="link-voltar" onClick={() => setPasso("escolha")}>← escolher outra opção</button>
            <div className="tipo-preview" style={{ background: TIPOS[tipoEscolhido].cor, color: TIPOS[tipoEscolhido].texto }}>
              {TIPOS[tipoEscolhido].label}
            </div>

            {(tipoEscolhido === "sabado_letivo" || tipoEscolhido === "substituicao") && (
              <label className="field">
                <span>Refere-se a qual dia da semana?</span>
                <select value={contaComo} onChange={(e) => setContaComo(e.target.value)}>
                  <option value="">Selecione...</option>
                  {DIAS_SEMANA_PT.slice(0, 5).map((nome, i) => (
                    <option key={i} value={i}>{nome}-feira</option>
                  ))}
                </select>
              </label>
            )}

            {tipoEscolhido === "feriado" && (
              <label className="field">
                <span>Esfera</span>
                <select value={esfera} onChange={(e) => setEsfera(e.target.value)}>
                  {ESFERAS_FERIADO.map((e) => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="field">
              <span>Rótulo / observação (opcional)</span>
              <input type="text" value={rotulo} onChange={(e) => setRotulo(e.target.value)}
                placeholder='ex.: "Aniversário do Município"' />
            </label>
          </div>
        )}

        {passo === "marco" && (
          <div className="modal-body">
            <button className="link-voltar" onClick={() => setPasso("escolha")}>← voltar</button>
            <fieldset className="listas-fieldset">
              <legend>Pode marcar mais de um ao mesmo tempo (ex.: início do ano letivo junto com início do semestre)</legend>
              <div className="marcos-grid">
                <label className="marco-check">
                  <input type="checkbox" checked={marcosSelecionados.has("inicio_ano")}
                    onChange={() => toggleMarco("inicio_ano")} />
                  <span>Início do ano letivo</span>
                </label>
                <label className="marco-check">
                  <input type="checkbox" checked={marcosSelecionados.has("fim_ano")}
                    onChange={() => toggleMarco("fim_ano")} />
                  <span>Fim do ano letivo</span>
                </label>
                {cfg.nomesPeriodo.map((nome, i) => (
                  <label className="marco-check" key={`ini-${i}`}>
                    <input type="checkbox" checked={marcosSelecionados.has(`inicio_periodo_${i}`)}
                      onChange={() => toggleMarco(`inicio_periodo_${i}`)} />
                    <span>Início do {nome}</span>
                  </label>
                ))}
                {cfg.nomesPeriodo.map((nome, i) => (
                  <label className="marco-check" key={`fim-${i}`}>
                    <input type="checkbox" checked={marcosSelecionados.has(`fim_periodo_${i}`)}
                      onChange={() => toggleMarco(`fim_periodo_${i}`)} />
                    <span>Fim do {nome}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {passo === "atividade" && (
          <div className="modal-body">
            <button className="link-voltar" onClick={() => setPasso("escolha")}>← voltar</button>
            <label className="field">
              <span>Categoria</span>
              <select value={categoriaAtividade} onChange={(e) => setCategoriaAtividade(e.target.value)}>
                {CATEGORIAS_ATIVIDADE.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Vai até (para atividades de vários dias, opcional)</span>
              <input type="date" value={dataFimAtividade} min={key} onChange={(e) => setDataFimAtividade(e.target.value)} />
            </label>
            <label className="field">
              <span>Descrição (opcional)</span>
              <input type="text" value={descAtividade} onChange={(e) => setDescAtividade(e.target.value)}
                placeholder="Detalhes..." />
            </label>
            {catAtividade.contaComoLetivoDisponivel && (
              <label className="marco-check">
                <input type="checkbox" checked={contaComoLetivoAtividade}
                  onChange={(e) => setContaComoLetivoAtividade(e.target.checked)} />
                <span>Envolve atividades com estudantes / contraturno — conta como dia letivo</span>
              </label>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleRestaurarPadrao}>Restaurar padrão</button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          {passo !== "escolha" && (
            <button className="btn btn-primary" onClick={handleSalvar}>Salvar</button>
          )}
        </div>
      </div>
    </div>
  );
}
