"use client";

import { useState } from "react";

const NIVEIS = [
  { key: "editor", label: "Editor", desc: "Pode alterar o calendário inteiro (mesmo acesso que você tem agora)." },
  { key: "comentador", label: "Comentador", desc: "Não pode alterar o calendário, mas pode deixar comentários." },
  { key: "visualizador", label: "Visualizador", desc: "Só pode ver e exportar — não pode alterar nem comentar." },
];

function LinhaLink({ nivel, url }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt("Copie o link:", url);
    }
  }
  return (
    <div className="share-linha">
      <div className="share-linha-texto">
        <strong>{nivel.label}</strong>
        <span>{nivel.desc}</span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</button>
    </div>
  );
}

export default function ShareDialog({ tokens, onClose }) {
  if (typeof window === "undefined") return null;
  const origem = window.location.origin;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Compartilhar calendário</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p className="escolha-hint">Cada nível gera um link diferente — envie o que combina com quem vai receber.</p>
          {tokens ? (
            NIVEIS.map((nivel) => (
              <LinhaLink key={nivel.key} nivel={nivel} url={`${origem}/c/${tokens[nivel.key]}`} />
            ))
          ) : (
            <p className="lista-vazia">Carregando links...</p>
          )}
        </div>
        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
