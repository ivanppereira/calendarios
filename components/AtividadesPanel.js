"use client";

import { useState } from "react";
import { CATEGORIAS_ATIVIDADE, categoriaInfo } from "../lib/constants";

function formatarBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarPeriodo(a) {
  if (!a.dataFim || a.dataFim === a.dataInicio) return formatarBR(a.dataInicio);
  return `${formatarBR(a.dataInicio)} a ${formatarBR(a.dataFim)}`;
}

export default function AtividadesPanel({ atividades, onAdd, onRemove, somenteLeitura }) {
  const [categoria, setCategoria] = useState("evento");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [desc, setDesc] = useState("");
  const [contaComoLetivo, setContaComoLetivo] = useState(false);

  const catInfo = categoriaInfo(categoria);

  function adicionar() {
    if (!dataInicio) return;
    onAdd({
      id: crypto.randomUUID(),
      categoria,
      dataInicio,
      dataFim: dataFim || dataInicio,
      desc: desc.trim(),
      contaComoLetivo: catInfo.contaComoLetivoDisponivel ? contaComoLetivo : false,
    });
    setDataInicio("");
    setDataFim("");
    setDesc("");
    setContaComoLetivo(false);
  }

  const ordenadas = [...atividades].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  return (
    <div className="panel">
      <h4>Atividades e prazos acadêmicos</h4>
      <p className="lista-vazia-hint">
        Matrícula, planejamento pedagógico, conselhos, colação de grau e demais prazos da secretaria.
      </p>

      {ordenadas.length === 0 && <p className="lista-vazia">Nenhuma atividade cadastrada ainda.</p>}
      <ul className="lista-itens">
        {ordenadas.map((a) => (
          <li key={a.id}>
            <span className="lista-data">{formatarPeriodo(a)}</span>
            <span className="lista-desc">
              <strong>{categoriaInfo(a.categoria).label}</strong>
              {a.desc ? ` — ${a.desc}` : ""}
              {a.contaComoLetivo && <span className="badge-letivo">conta como letivo</span>}
            </span>
            {!somenteLeitura && (
              <button className="icon-btn" onClick={() => onRemove(a.id)} aria-label="Remover">×</button>
            )}
          </li>
        ))}
      </ul>

      {!somenteLeitura && (
      <div className="atividade-form">
        <label className="field">
          <span>Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_ATIVIDADE.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </label>
        <div className="atividade-datas">
          <label className="field">
            <span>De</span>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label className="field">
            <span>Até (opcional)</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Descrição (opcional)</span>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhes..." />
        </label>
        {catInfo.contaComoLetivoDisponivel && (
          <label className="marco-check">
            <input type="checkbox" checked={contaComoLetivo} onChange={(e) => setContaComoLetivo(e.target.checked)} />
            <span>Envolve atividades com estudantes / contraturno — conta como dia letivo</span>
          </label>
        )}
        <button className="btn btn-ghost btn-sm" onClick={adicionar}>Adicionar</button>
      </div>
      )}
    </div>
  );
}
