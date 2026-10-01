"use client";

import { useEffect, useState } from "react";
import { CAMPUS_LIST } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";

export default function UserManagementModal({ onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);

  async function carregarUsuarios() {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await apiFetch("/api/usuarios");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao carregar usuários");
      setUsuarios(data.usuarios || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function atualizarUsuario(u, alteracoes) {
    const usuarioAtualizado = { ...u, ...alteracoes };
    setSalvandoId(u.id);
    try {
      const resp = await apiFetch("/api/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: usuarioAtualizado.id,
          campus: usuarioAtualizado.campus,
          pode_criar: usuarioAtualizado.pode_criar,
          pode_publicar: usuarioAtualizado.pode_publicar,
          e_superusuario: usuarioAtualizado.e_superusuario,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao atualizar permissões");
      setUsuarios((prev) => prev.map((item) => (item.id === u.id ? data.usuario : item)));
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>
        <div className="modal-header">
          <h3>Painel do Superusuário — Gestão de Cadastro e Permissões</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {erro && <p className="erro-msg-modal">{erro}</p>}
          {carregando && <p className="lista-vazia">Carregando cadastro de usuários...</p>}

          {!carregando && usuarios.length === 0 && (
            <p className="lista-vazia">Nenhum usuário cadastrado ainda.</p>
          )}

          {!carregando && usuarios.length > 0 && (
            <table className="calendarios-tabela">
              <thead>
                <tr>
                  <th>Nome / E-mail</th>
                  <th>Campus Vinculado</th>
                  <th>Pode Criar?</th>
                  <th>Pode Publicar?</th>
                  <th>Superusuário?</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div><strong>{u.nome || "Usuário"}</strong></div>
                      <small style={{ color: "#6b7280" }}>{u.email}</small>
                    </td>
                    <td>
                      <select
                        value={u.campus || "Pouso Alegre"}
                        disabled={salvandoId === u.id}
                        onChange={(e) => atualizarUsuario(u, { campus: e.target.value })}
                        className="select-compact"
                      >
                        {CAMPUS_LIST.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!u.pode_criar}
                        disabled={salvandoId === u.id}
                        onChange={(e) => atualizarUsuario(u, { pode_criar: e.target.checked })}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!u.pode_publicar}
                        disabled={salvandoId === u.id}
                        onChange={(e) => atualizarUsuario(u, { pode_publicar: e.target.checked })}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!u.e_superusuario}
                        disabled={salvandoId === u.id}
                        onChange={(e) => atualizarUsuario(u, { e_superusuario: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
