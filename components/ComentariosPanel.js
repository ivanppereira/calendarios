"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useAuthContext } from "../lib/AuthContext";

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ComentariosPanel({ endpointBase, podeComentar }) {
  const { nome: meuNome } = useAuthContext();
  const [comentarios, setComentarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      const resp = await apiFetch(`${endpointBase}/comentarios`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao carregar comentários");
      setComentarios(data.comentarios || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, [endpointBase]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      const resp = await apiFetch(`${endpointBase}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao comentar");
      setComentarios((p) => [...p, data.comentario]);
      setTexto("");
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="panel">
      <h4>Comentários</h4>
      {erro && <p className="erro-msg-modal">{erro}</p>}
      {carregando && <p className="lista-vazia">Carregando...</p>}
      {!carregando && comentarios.length === 0 && <p className="lista-vazia">Nenhum comentário ainda.</p>}
      <ul className="comentarios-lista">
        {comentarios.map((c) => (
          <li key={c.id}>
            <div className="comentario-cabecalho">
              <strong>{c.autor_nome || "Anônimo"}</strong>
              <span>{formatarDataHora(c.criado_em)}</span>
            </div>
            <p>{c.texto}</p>
          </li>
        ))}
      </ul>
      {podeComentar && (
        <div className="atividade-form">
          <label className="field">
            <span>Novo comentário (publicado como {meuNome})</span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Escreva um comentário..." />
          </label>
          <button className="btn btn-ghost btn-sm" disabled={enviando} onClick={enviar}>
            {enviando ? "Enviando..." : "Comentar"}
          </button>
        </div>
      )}
    </div>
  );
}
