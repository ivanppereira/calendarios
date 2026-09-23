"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch";

const NIVEIS = [
  { key: "editor", label: "Editor" },
  { key: "comentador", label: "Comentador" },
  { key: "visualizador", label: "Visualizador" },
];

export default function ShareDialog({ calendarioId, onClose }) {
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("editor");
  const [donoEmail, setDonoEmail] = useState("");
  const [permissoes, setPermissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarPermissoes() {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await apiFetch(`/api/calendarios/${calendarioId}/compartilhar`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao carregar permissões");
      setDonoEmail(data.dono_email || "");
      setPermissoes(data.permissoes || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (calendarioId) carregarPermissoes();
  }, [calendarioId]);

  async function adicionarCompartilhamento(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const resp = await apiFetch(`/api/calendarios/${calendarioId}/compartilhar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), papel }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao adicionar e-mail");
      setEmail("");
      await carregarPermissoes();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function removerCompartilhamento(targetEmail) {
    if (!confirm(`Remover o acesso de ${targetEmail}?`)) return;
    setErro(null);
    try {
      const resp = await apiFetch(`/api/calendarios/${calendarioId}/compartilhar?email=${encodeURIComponent(targetEmail)}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao remover acesso");
      await carregarPermissoes();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Compartilhar por E-mail</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="modal-body">
          {erro && <p className="erro-msg-modal">{erro}</p>}

          <form onSubmit={adicionarCompartilhamento} className="share-email-form">
            <label className="escolha-hint">Convidar pessoas específicas por e-mail:</label>
            <div className="share-input-row" style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                type="email"
                placeholder="digite.o.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)" }}
                required
              />
              <select
                value={papel}
                onChange={(e) => setPapel(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)" }}
              >
                {NIVEIS.map((n) => (
                  <option key={n.key} value={n.key}>{n.label}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Convidar"}
              </button>
            </div>
          </form>

          <div className="share-lista-container" style={{ marginTop: 16 }}>
            <h5 style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "var(--muted)", textTransform: "uppercase" }}>
              Pessoas com acesso
            </h5>

            {carregando ? (
              <p className="lista-vazia">Carregando permissões...</p>
            ) : (
              <ul className="share-lista" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {donoEmail && (
                  <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f6f7fa", borderRadius: 6 }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--navy-dark)" }}>{donoEmail}</strong>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>Proprietário</span>
                    </div>
                    <span className="badge-motivo badge-autosave">Dono</span>
                  </li>
                )}

                {permissoes.map((p) => (
                  <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f6f7fa", borderRadius: 6 }}>
                    <div>
                      <strong style={{ fontSize: "0.85rem", color: "var(--navy-dark)" }}>{p.email}</strong>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                        Permissão: {NIVEIS.find((n) => n.key === p.papel)?.label || p.papel}
                      </span>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => removerCompartilhamento(p.email)}>
                      Remover
                    </button>
                  </li>
                ))}

                {!donoEmail && permissoes.length === 0 && (
                  <p className="lista-vazia">Nenhuma pessoa convidada ainda.</p>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  );
}
