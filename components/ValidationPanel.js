"use client";

import { useState } from "react";

function Grupo({ nome, itens }) {
  const bloqueantes = itens.filter((i) => !i.informativo);
  const [aberto, setAberto] = useState(!bloqueantes.every((i) => i.ok));
  const pendentes = bloqueantes.filter((i) => !i.ok).length;

  return (
    <div className="grupo-validacao">
      <button className="grupo-header" onClick={() => setAberto((a) => !a)}>
        <span className={"grupo-status " + (pendentes === 0 ? "ok" : "pending")}>
          {pendentes === 0 ? "✓" : pendentes}
        </span>
        <span className="grupo-nome">{nome}</span>
        <span className="grupo-caret">{aberto ? "▾" : "▸"}</span>
      </button>
      {aberto && (
        <ul className="checklist">
          {itens.map((item, i) => (
            <li key={i} className={item.informativo ? "info" : (item.ok ? "ok" : "pending")}>
              <span className="mark">{item.informativo ? "i" : (item.ok ? "✓" : "!")}</span>
              <span>{item.msg}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ValidationPanel({ validacao }) {
  const { ok, checklist } = validacao;

  const grupos = [];
  const indicePorNome = new Map();
  for (const item of checklist) {
    const nome = item.grupo || "Geral";
    if (!indicePorNome.has(nome)) {
      indicePorNome.set(nome, grupos.length);
      grupos.push({ nome, itens: [] });
    }
    grupos[indicePorNome.get(nome)].itens.push(item);
  }

  return (
    <div className="panel">
      <div className={"status-banner" + (ok ? " ok" : " pending")}>
        {ok ? "✅ Calendário fecha com todos os requisitos" : "⚠️ Ainda há pendências"}
      </div>
      <div className="grupos-lista">
        {grupos.map((g) => (
          <Grupo key={g.nome} nome={g.nome} itens={g.itens} />
        ))}
      </div>
    </div>
  );
}
