"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_TIPO } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";
import { useAuthContext } from "../lib/AuthContext";

function formatarDataHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Lobby() {
  const router = useRouter();
  const { nome, avatarUrl, sair } = useAuthContext();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  async function recarregar() {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await apiFetch("/api/calendarios");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao listar calendários");
      setLista(data.calendarios || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregar(); }, []);

  async function criarNovo() {
    setCriando(true);
    setErro(null);
    try {
      const resp = await apiFetch("/api/calendarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: "Calendário sem título",
          ano: new Date().getFullYear() + 1,
          tipo: "superior",
          campus: "",
          overrides: {}, marcos: {}, atividades: [],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao criar calendário");
      router.push(`/calendario/${data.calendario.id}`);
    } catch (e) {
      setErro(e.message);
      setCriando(false);
    }
  }

  async function clonar(id) {
    setOcupado(id);
    try {
      const resp = await apiFetch(`/api/calendarios/${id}/clonar`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao clonar calendário");
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(id) {
    if (!confirm("Excluir este calendário? Essa ação não pode ser desfeita.")) return;
    setOcupado(id);
    try {
      const resp = await apiFetch(`/api/calendarios/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao excluir calendário");
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="lobby-shell">
      <header className="lobby-header">
        <div className="lobby-header-topo">
          <div>
            <h1>Calendário Acadêmico</h1>
            <p>Seus calendários são salvos automaticamente. Você pode compartilhar o seu calendário diretamente por e-mail com outras pessoas para editar ou visualizar juntos.</p>
          </div>
          <div className="usuario-chip">
            {avatarUrl && <img src={avatarUrl} alt="" className="usuario-avatar" />}
            <span>{nome}</span>
            <button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={criarNovo} disabled={criando}>
          {criando ? "Criando..." : "+ Criar novo calendário"}
        </button>
      </header>

      <main className="lobby-body">
        {erro && <p className="erro-msg-modal">{erro}</p>}
        {carregando && <p className="lista-vazia">Carregando...</p>}
        {!carregando && lista.length === 0 && (
          <p className="lista-vazia">Nenhum calendário ainda. Clique em "Criar novo calendário" para começar.</p>
        )}
        {!carregando && lista.length > 0 && (
          <table className="calendarios-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ano</th>
                <th>Tipo</th>
                <th>Atualizado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="lobby-link" onClick={() => router.push(`/calendario/${c.id}`)}>{c.nome}</button>
                  </td>
                  <td>{c.ano}</td>
                  <td>{CONFIG_TIPO[c.tipo]?.label || c.tipo}</td>
                  <td>{formatarDataHora(c.updated_at)}</td>
                  <td className="calendarios-acoes">
                    <button className="btn btn-ghost btn-sm" disabled={ocupado === c.id} onClick={() => router.push(`/calendario/${c.id}`)}>Abrir</button>
                    <button className="btn btn-ghost btn-sm" disabled={ocupado === c.id} onClick={() => clonar(c.id)}>Duplicar</button>
                    <button className="btn btn-ghost btn-sm btn-danger" disabled={ocupado === c.id} onClick={() => excluir(c.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
