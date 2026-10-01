"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_TIPO, CAMPUS_LIST } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";
import { useAuthContext } from "../lib/AuthContext";
import UserManagementModal from "./UserManagementModal";

function formatarDataHora(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Lobby() {
  const router = useRouter();
  const auth = useAuthContext();
  const { nome, avatarUrl, sair, logado, entrarComGoogle, usuario } = auth;

  const [abaAtiva, setAbaAtiva] = useState("publicos"); // 'publicos' | 'meus'
  const [campusFiltro, setCampusFiltro] = useState("TODOS");

  const [listaPublicos, setListaPublicos] = useState([]);
  const [listaMeus, setListaMeus] = useState([]);
  const [perfil, setPerfil] = useState(null);

  const [carregandoPublicos, setCarregandoPublicos] = useState(true);
  const [carregandoMeus, setCarregandoMeus] = useState(false);
  const [erro, setErro] = useState(null);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [modalSuperaberto, setModalSuperaberto] = useState(false);

  // Carregar calendários públicos da comunidade (Requisito 2 & 3)
  async function carregarPublicos() {
    setCarregandoPublicos(true);
    try {
      const resp = await fetch("/api/calendarios/publicos");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao carregar calendários públicos");
      setListaPublicos(data.calendarios || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoPublicos(false);
    }
  }

  // Carregar calendários do próprio usuário e compartilhados (Requisito 4 & 6)
  async function carregarMeus() {
    if (!logado) return;
    setCarregandoMeus(true);
    try {
      const resp = await apiFetch("/api/calendarios");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao listar calendários");
      setListaMeus(data.calendarios || []);
      if (data.perfil) setPerfil(data.perfil);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoMeus(false);
    }
  }

  useEffect(() => {
    carregarPublicos();
    if (logado) {
      carregarMeus();
      setAbaAtiva("meus");
    }
  }, [logado]);

  async function criarNovo() {
    if (!perfil?.pode_criar && !perfil?.e_superusuario) {
      alert("Seu usuário não possui permissão para criar novos calendários.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const resp = await apiFetch("/api/calendarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: `Calendário Acadêmico - Campus ${perfil?.campus || "Pouso Alegre"}`,
          ano: new Date().getFullYear() + 1,
          tipo: "superior",
          campus: perfil?.campus || "Pouso Alegre",
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

  async function alternarPublicacao(c) {
    if (!perfil?.pode_publicar && !perfil?.e_superusuario) {
      alert("Seu usuário não possui permissão para publicar calendários.");
      return;
    }
    setOcupado(c.id);
    try {
      const novoStatus = !c.publicado;
      const resp = await apiFetch(`/api/calendarios/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicado: novoStatus }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao alterar status de publicação");
      await carregarMeus();
      await carregarPublicos();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function clonar(id) {
    if (!perfil?.pode_criar && !perfil?.e_superusuario) {
      alert("Seu usuário não possui permissão para duplicar calendários.");
      return;
    }
    setOcupado(id);
    try {
      const resp = await apiFetch(`/api/calendarios/${id}/clonar`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao clonar calendário");
      await carregarMeus();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(c) {
    const eDono = c.dono_email === usuario?.email || c.dono_id === usuario?.id;
    const eSuper = perfil?.e_superusuario;

    // Requisito 6: Um usuário não pode apagar o calendário construído por outro
    if (!eDono && !eSuper) {
      alert("Você não pode apagar o calendário elaborado por outro usuário.");
      return;
    }

    if (!confirm(`Excluir o calendário "${c.nome}"? Essa ação não pode ser desfeita.`)) return;
    setOcupado(c.id);
    try {
      const resp = await apiFetch(`/api/calendarios/${c.id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao excluir calendário");
      await carregarMeus();
      await carregarPublicos();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  // Agrupamento por campus (Requisito 3)
  const calendariosFiltradosPublicos = campusFiltro === "TODOS"
    ? listaPublicos
    : listaPublicos.filter((c) => (c.campus || "Pouso Alegre").toLowerCase() === campusFiltro.toLowerCase());

  const publicosPorCampus = {};
  CAMPUS_LIST.forEach((camp) => {
    publicosPorCampus[camp] = listaPublicos.filter((c) => (c.campus || "Pouso Alegre").toLowerCase() === camp.toLowerCase());
  });

  return (
    <div className="lobby-shell">
      <header className="lobby-header">
        <div className="lobby-header-topo">
          <div>
            <h1>Calendário Acadêmico — IFSULDEMINAS</h1>
            <p>Portal de publicação e elaboração de calendários acadêmicos para os campus do IFSULDEMINAS.</p>
          </div>

          <div className="usuario-chip">
            {logado ? (
              <>
                {avatarUrl && <img src={avatarUrl} alt="" className="usuario-avatar" />}
                <div style={{ textAlign: "left", lineHeight: "1.2" }}>
                  <div><strong>{nome}</strong></div>
                  <small style={{ opacity: 0.85 }}>
                    Campus: <strong>{perfil?.campus || "Pouso Alegre"}</strong>
                    {perfil?.e_superusuario && <span style={{ marginLeft: 6, color: "#fbbf24" }}>★ Superusuário</span>}
                  </small>
                </div>

                {perfil?.e_superusuario && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setModalSuperaberto(true)} title="Gerenciar permissões dos usuários">
                    ⚙ Gerenciar Usuários
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={entrarComGoogle}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ marginRight: 6 }}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
                Entrar no Sistema (Servidores)
              </button>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "8px" }}>
          <button
            className={`btn ${abaAtiva === "publicos" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setAbaAtiva("publicos")}
          >
            🌐 Calendários Públicos da Comunidade
          </button>
          {logado && (
            <button
              className={`btn ${abaAtiva === "meus" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setAbaAtiva("meus")}
            >
              📋 Meus Calendários ({listaMeus.length})
            </button>
          )}
        </div>
      </header>

      <main className="lobby-body">
        {erro && <p className="erro-msg-modal">{erro}</p>}

        {/* ABA 1: CALENDÁRIOS PÚBLICOS POR CAMPUS (Requisitos 2 e 3) */}
        {abaAtiva === "publicos" && (
          <div>
            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "var(--navy-dark)" }}>Filtrar por Campus:</span>
              <button
                className={`btn btn-sm ${campusFiltro === "TODOS" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setCampusFiltro("TODOS")}
              >
                Todos os Campus
              </button>
              {CAMPUS_LIST.map((camp) => (
                <button
                  key={camp}
                  className={`btn btn-sm ${campusFiltro === camp ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setCampusFiltro(camp)}
                >
                  {camp} ({publicosPorCampus[camp]?.length || 0})
                </button>
              ))}
            </div>

            {carregandoPublicos && <p className="lista-vazia">Carregando calendários publicados...</p>}

            {!carregandoPublicos && listaPublicos.length === 0 && (
              <p className="lista-vazia">Nenhum calendário foi disponibilizado/publicado ainda para a comunidade acadêmica.</p>
            )}

            {!carregandoPublicos && listaPublicos.length > 0 && (
              <div>
                {campusFiltro === "TODOS" ? (
                  CAMPUS_LIST.map((camp) => {
                    const cals = publicosPorCampus[camp] || [];
                    if (cals.length === 0) return null;
                    return (
                      <section key={camp} style={{ marginBottom: "28px" }}>
                        <h3 style={{ color: "var(--navy-dark)", borderBottom: "2px solid var(--gold)", paddingBottom: "6px", marginBottom: "12px" }}>
                          Campus {camp}
                        </h3>
                        <table className="calendarios-tabela">
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Ano</th>
                              <th>Tipo</th>
                              <th>Autor / Responsável</th>
                              <th>Atualizado em</th>
                              <th>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cals.map((c) => (
                              <tr key={c.id}>
                                <td><strong>{c.nome}</strong></td>
                                <td>{c.ano}</td>
                                <td>{CONFIG_TIPO[c.tipo]?.label || c.tipo}</td>
                                <td>{c.dono_email || "Equipe Acadêmica"}</td>
                                <td>{formatarDataHora(c.updated_at)}</td>
                                <td>
                                  <button className="btn btn-primary btn-sm" onClick={() => router.push(`/calendario/${c.id}`)}>
                                    👁 Visualizar (Comunidade)
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    );
                  })
                ) : (
                  <div>
                    <h3 style={{ color: "var(--navy-dark)", marginBottom: "12px" }}>Calendários do Campus {campusFiltro}</h3>
                    {calendariosFiltradosPublicos.length === 0 ? (
                      <p className="lista-vazia">Nenhum calendário publicado para este campus.</p>
                    ) : (
                      <table className="calendarios-tabela">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Ano</th>
                            <th>Tipo</th>
                            <th>Autor / Responsável</th>
                            <th>Atualizado em</th>
                            <th>Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calendariosFiltradosPublicos.map((c) => (
                            <tr key={c.id}>
                              <td><strong>{c.nome}</strong></td>
                              <td>{c.ano}</td>
                              <td>{CONFIG_TIPO[c.tipo]?.label || c.tipo}</td>
                              <td>{c.dono_email || "Equipe Acadêmica"}</td>
                              <td>{formatarDataHora(c.updated_at)}</td>
                              <td>
                                <button className="btn btn-primary btn-sm" onClick={() => router.push(`/calendario/${c.id}`)}>
                                  👁 Visualizar (Comunidade)
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: MEUS CALENDÁRIOS E COMPARTILHADOS (Requisitos 4, 5 e 6) */}
        {abaAtiva === "meus" && logado && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2>Seus Calendários em Construção / Elaborados</h2>
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Você está vinculado ao <strong>Campus {perfil?.campus || "Pouso Alegre"}</strong>.
                  {!perfil?.pode_criar && !perfil?.e_superusuario && (
                    <span style={{ color: "#c53030", marginLeft: 8 }}>(Seu cadastro não possui permissão para criar novos calendários)</span>
                  )}
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={criarNovo}
                disabled={criando || (!perfil?.pode_criar && !perfil?.e_superusuario)}
              >
                {criando ? "Criando..." : `+ Criar novo calendário (${perfil?.campus || "Meu Campus"})`}
              </button>
            </div>

            {carregandoMeus && <p className="lista-vazia">Carregando seus calendários...</p>}

            {!carregandoMeus && listaMeus.length === 0 && (
              <p className="lista-vazia">Você ainda não possui calendários elaborados. Clique acima para criar um.</p>
            )}

            {!carregandoMeus && listaMeus.length > 0 && (
              <table className="calendarios-tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Campus</th>
                    <th>Ano</th>
                    <th>Tipo</th>
                    <th>Status de Publicação</th>
                    <th>Atualizado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listaMeus.map((c) => {
                    const eDono = c.dono_email === usuario?.email || c.dono_id === usuario?.id;
                    const eSuper = perfil?.e_superusuario;

                    return (
                      <tr key={c.id}>
                        <td>
                          <button className="lobby-link" onClick={() => router.push(`/calendario/${c.id}`)}>
                            {c.nome}
                          </button>
                          {!eDono && <small style={{ display: "block", color: "#6b7280" }}>Compartilhado por: {c.dono_email}</small>}
                        </td>
                        <td><span className="badge-campus">{c.campus || "Pouso Alegre"}</span></td>
                        <td>{c.ano}</td>
                        <td>{CONFIG_TIPO[c.tipo]?.label || c.tipo}</td>
                        <td>
                          <button
                            className={`btn btn-sm ${c.publicado ? "btn-success" : "btn-outline"}`}
                            disabled={ocupado === c.id || (!perfil?.pode_publicar && !eSuper)}
                            onClick={() => alternarPublicacao(c)}
                            title={!perfil?.pode_publicar && !eSuper ? "Seu usuário não tem permissão para publicar" : "Clique para alterar visualização pública"}
                          >
                            {c.publicado ? "✓ Publicado (Comunidade)" : "🔒 Em construção (Privado)"}
                          </button>
                        </td>
                        <td>{formatarDataHora(c.updated_at)}</td>
                        <td className="calendarios-acoes">
                          <button className="btn btn-ghost btn-sm" disabled={ocupado === c.id} onClick={() => router.push(`/calendario/${c.id}`)}>
                            {eDono || eSuper ? "Editar" : "Abrir"}
                          </button>
                          <button className="btn btn-ghost btn-sm" disabled={ocupado === c.id || (!perfil?.pode_criar && !eSuper)} onClick={() => clonar(c.id)}>
                            Duplicar
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-danger"
                            disabled={ocupado === c.id || (!eDono && !eSuper)}
                            onClick={() => excluir(c)}
                            title={!eDono && !eSuper ? "Você não pode apagar o calendário construído por outro usuário" : "Excluir calendário"}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {modalSuperaberto && (
        <UserManagementModal onClose={() => { setModalSuperaberto(false); carregarMeus(); }} />
      )}
    </div>
  );
}
