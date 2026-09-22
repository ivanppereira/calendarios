"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiFetch";

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoricoModal({ calendarioId, onClose, onRestaurado }) {
  const [versoes, setVersoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroAutor, setFiltroAutor] = useState("todos");
  const [restaurando, setRestaurando] = useState(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        const resp = await apiFetch(`/api/calendarios/${calendarioId}/versoes`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Falha ao carregar o histórico");
        setVersoes(data.versoes || []);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    })();
  }, [calendarioId]);

  const autores = useMemo(() => {
    const mapa = new Map();
    for (const v of versoes) {
      if (v.autor_id) mapa.set(v.autor_id, v.autor_nome || "Anônimo");
    }
    return Array.from(mapa.entries());
  }, [versoes]);

  const filtradas = filtroAutor === "todos" ? versoes : versoes.filter((v) => v.autor_id === filtroAutor);

  async function restaurar(versaoId) {
    if (!confirm("Restaurar esta versão? O estado atual será salvo no histórico antes, então você ainda pode desfazer depois.")) return;
    setRestaurando(versaoId);
    try {
      const resp = await apiFetch(`/api/calendarios/${calendarioId}/versoes/${versaoId}`, {
        method: "POST",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao restaurar");
      onRestaurado(data.calendario);
      onClose();
    } catch (e) {
      setErro(e.message);
    } finally {
      setRestaurando(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Histórico de versões</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          {erro && <p className="erro-msg-modal">{erro}</p>}
          {autores.length > 0 && (
            <label className="field" style={{ maxWidth: 280 }}>
              <span>Filtrar por quem editou</span>
              <select value={filtroAutor} onChange={(e) => setFiltroAutor(e.target.value)}>
                <option value="todos">Todo mundo</option>
                {autores.map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
            </label>
          )}
          {carregando && <p className="lista-vazia">Carregando...</p>}
          {!carregando && filtradas.length === 0 && (
            <p className="lista-vazia">Ainda não há versões salvas para este filtro. O histórico começa a se formar conforme o calendário é editado.</p>
          )}
          {!carregando && filtradas.length > 0 && (
            <ul className="historico-lista">
              {filtradas.map((v) => (
                <li key={v.id}>
                  <div className="historico-info">
                    <strong>{v.autor_nome || "Anônimo"}</strong>
                    <span>{formatarDataHora(v.criado_em)}</span>
                    <span className={"badge-motivo badge-" + v.motivo}>
                      {v.motivo === "restauracao" ? "antes de uma restauração" : "salvamento automático"}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" disabled={restaurando === v.id} onClick={() => restaurar(v.id)}>
                    {restaurando === v.id ? "Restaurando..." : "Restaurar esta versão"}
                  </button>
                </li>
              ))}
            </ul>
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
