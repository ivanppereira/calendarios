"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_TIPO, pyWeekday, keyToDate, enumerarIntervalo, categoriaInfo, metasIndividuais } from "../lib/constants";
import { buildEffectiveDias, autoAjustarMarcos } from "../lib/effective";
import { validarCalendario } from "../lib/validation";
import { resumoPeriodo } from "../lib/periodSummary";
import { useCalendarioColaborativo } from "../lib/useCalendarioColaborativo";
import MonthGrid from "./MonthGrid";
import DayPopover from "./DayPopover";
import ValidationPanel from "./ValidationPanel";
import AtividadesPanel from "./AtividadesPanel";
import ComentariosPanel from "./ComentariosPanel";
import Toolbar from "./Toolbar";
import PeriodSummaryTable from "./PeriodSummaryTable";
import ShareDialog from "./ShareDialog";
import HistoricoModal from "./HistoricoModal";
import { apiFetch } from "../lib/apiFetch";
import { useAuthContext } from "../lib/AuthContext";

const STATUS_LABEL = {
  sincronizado: "Salvo",
  salvando: "Salvando...",
  erro: "Erro ao salvar",
};

const PAPEL_LABEL = {
  editor: null,
  comentador: "Modo comentário",
  visualizador: "Somente leitura",
};

export default function CalendarApp({ calendarioId, token }) {
  const router = useRouter();
  const { meuNome, avatarUrl, sair } = useAuthContext();
  const {
    carregando, erroCarregar, statusSalvamento, colaboradoresOnline, papel, podeEditar,
    nome, setNome, ano, setAno, tipo, setTipo, campus, setCampus,
    overrides, setOverrides, marcosPorDia, setMarcosPorDia, atividades, setAtividades,
    aplicarEstadoCompleto,
  } = useCalendarioColaborativo({ calendarioId, token });

  const [selecionado, setSelecionado] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState(null);
  const [ferramentaAtiva, setFerramentaAtiva] = useState(null);
  const [duplicando, setDuplicando] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(null); // null | 'compartilhar' | 'historico'
  const pintandoRef = useRef(false);

  const podeComentar = papel === "editor" || papel === "comentador";
  const endpointBase = calendarioId ? `/api/calendarios/${calendarioId}` : `/api/compartilhado/${token}`;

  const dias = useMemo(() => buildEffectiveDias(ano, overrides, marcosPorDia), [ano, overrides, marcosPorDia]);
  const validacao = useMemo(() => validarCalendario(dias, tipo, atividades), [dias, tipo, atividades]);

  const anotacoesPorDia = useMemo(() => {
    const s = new Set();
    for (const a of atividades) {
      for (const k of enumerarIntervalo(a.dataInicio, a.dataFim || a.dataInicio)) s.add(k);
    }
    return s;
  }, [atividades]);

  const resumosPeriodo = useMemo(
    () => validacao.periodos.map((p) => ({ periodo: p, resumo: resumoPeriodo(p, dias) })),
    [validacao.periodos, dias]
  );

  const [diaSabadoPendente, setDiaSabadoPendente] = useState(null);
  const [diaConselhoPendente, setDiaConselhoPendente] = useState(null);

  useEffect(() => {
    function onUp() {
      if (pintandoRef.current) {
        pintandoRef.current = false;
        setFerramentaAtiva(null);
      }
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const marcarComoLetivo = useCallback((dataInicio, dataFim, rotulo) => {
    const chaves = enumerarIntervalo(dataInicio, dataFim || dataInicio);
    setOverrides((prev) => {
      const next = { ...prev };
      for (const key of chaves) {
        const wd = pyWeekday(keyToDate(key));
        if (wd < 5) next[key] = { tipo: "letivo", contaComo: wd, rotulo: rotulo || null };
      }
      return next;
    });
  }, [setOverrides]);

  const salvarDia = useCallback((key, novo) => {
    if (!podeEditar) return;
    setOverrides((prevOverrides) => {
      const nextOverrides = { ...prevOverrides };
      if (novo.limpar) delete nextOverrides[key];
      else nextOverrides[key] = { tipo: novo.tipo, contaComo: novo.contaComo, rotulo: novo.rotulo };

      setMarcosPorDia((prevMarcos) => {
        const nextMarcos = { ...prevMarcos };
        if (novo.limpar || !novo.marcos || novo.marcos.length === 0) delete nextMarcos[key];
        else nextMarcos[key] = novo.marcos;
        return autoAjustarMarcos(nextMarcos, nextOverrides, ano, tipo, metasIndividuais(tipo));
      });

      return nextOverrides;
    });

    if (!novo.limpar && novo.addAtividade) {
      setAtividades((p) => [...p, { id: crypto.randomUUID(), ...novo.addAtividade }]);
      if (novo.addAtividade.contaComoLetivo) {
        marcarComoLetivo(novo.addAtividade.dataInicio, novo.addAtividade.dataFim, categoriaInfo(novo.addAtividade.categoria).label);
      }
    }
    setSelecionado(null);
  }, [podeEditar, marcarComoLetivo, setOverrides, setMarcosPorDia, setAtividades, ano, tipo]);

  const aplicarFerramenta = useCallback((key) => {
    if (!podeEditar || !ferramentaAtiva) return;
    if (ferramentaAtiva.kind === "tipo") {
      if (ferramentaAtiva.tipo === "sabado_letivo") {
        setDiaSabadoPendente(key);
        return;
      }
      if (ferramentaAtiva.tipo === "conselho") {
        setDiaConselhoPendente(key);
        return;
      }
      setOverrides((prevOverrides) => {
        const nextOverrides = {
          ...prevOverrides,
          [key]: { tipo: ferramentaAtiva.tipo, contaComo: ferramentaAtiva.contaComo ?? null, rotulo: null },
        };
        setMarcosPorDia((prevMarcos) =>
          autoAjustarMarcos(prevMarcos, nextOverrides, ano, tipo, metasIndividuais(tipo))
        );
        return nextOverrides;
      });
    } else if (ferramentaAtiva.kind === "marco") {
      setMarcosPorDia((prev) => {
        const next = {};
        for (const [k, arr] of Object.entries(prev)) {
          const filtrado = arr.filter((m) => m !== ferramentaAtiva.marco);
          if (filtrado.length) next[k] = filtrado;
        }
        const atual = new Set(next[key] || []);
        atual.add(ferramentaAtiva.marco);
        next[key] = Array.from(atual);
        return autoAjustarMarcos(next, overrides, ano, tipo, metasIndividuais(tipo));
      });
    } else if (ferramentaAtiva.kind === "atividade") {
      setAtividades((prev) => {
        if (prev.some((a) => a.dataInicio === key && a.dataFim === key && a.categoria === ferramentaAtiva.categoria && a.desc === ferramentaAtiva.descricao)) {
          return prev;
        }
        return [...prev, {
          id: crypto.randomUUID(), categoria: ferramentaAtiva.categoria,
          dataInicio: key, dataFim: key, desc: ferramentaAtiva.descricao,
          contaComoLetivo: ferramentaAtiva.contaComoLetivo,
        }];
      });
      if (ferramentaAtiva.contaComoLetivo) {
        marcarComoLetivo(key, key, categoriaInfo(ferramentaAtiva.categoria).label);
      }
    }
  }, [podeEditar, ferramentaAtiva, marcarComoLetivo, setOverrides, setMarcosPorDia, setAtividades, ano, tipo, overrides]);

  const handleDayMouseDown = useCallback((key) => {
    if (!podeEditar) return;
    if (!ferramentaAtiva) {
      setSelecionado(key);
      return;
    }
    aplicarFerramenta(key);
    if (ferramentaAtiva.kind !== "marco") {
      pintandoRef.current = true;
    }
  }, [podeEditar, ferramentaAtiva, aplicarFerramenta]);

  const handleDayMouseEnter = useCallback((key) => {
    if (podeEditar && ferramentaAtiva && ferramentaAtiva.kind !== "marco" && pintandoRef.current) {
      aplicarFerramenta(key);
    }
  }, [podeEditar, ferramentaAtiva, aplicarFerramenta]);

  function confirmarSabadoLetivo(wdIndex) {
    if (!diaSabadoPendente) return;
    const key = diaSabadoPendente;
    setOverrides((prevOverrides) => {
      const nextOverrides = {
        ...prevOverrides,
        [key]: { tipo: "sabado_letivo", contaComo: Number(wdIndex), rotulo: null },
      };
      setMarcosPorDia((prevMarcos) =>
        autoAjustarMarcos(prevMarcos, nextOverrides, ano, tipo, metasIndividuais(tipo))
      );
      return nextOverrides;
    });
    setDiaSabadoPendente(null);
  }

  function confirmarConselho(rotuloConselho) {
    if (!diaConselhoPendente) return;
    const key = diaConselhoPendente;
    setOverrides((prevOverrides) => {
      const nextOverrides = {
        ...prevOverrides,
        [key]: { tipo: "conselho", contaComo: null, rotulo: rotuloConselho },
      };
      setMarcosPorDia((prevMarcos) =>
        autoAjustarMarcos(prevMarcos, nextOverrides, ano, tipo, metasIndividuais(tipo))
      );
      return nextOverrides;
    });
    setDiaConselhoPendente(null);
  }

  async function exportar() {
    setExportando(true);
    setErroExport(null);
    try {
      const resp = await apiFetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano, tipo, dias, atividades, campus }),
      });
      if (!resp.ok) throw new Error(`Erro ${resp.status} ao gerar a planilha`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Calendario_Academico_${ano}_${tipo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErroExport(e.message);
    } finally {
      setExportando(false);
    }
  }

  async function duplicar() {
    setDuplicando(true);
    try {
      const resp = await apiFetch(`${endpointBase}/clonar`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Falha ao duplicar");
      router.push(`/calendario/${data.calendario.id}`);
    } catch (e) {
      setErroExport(e.message);
      setDuplicando(false);
    }
  }

  if (carregando) {
    return <div className="tela-central"><p>Carregando calendário...</p></div>;
  }
  if (erroCarregar) {
    return (
      <div className="tela-central">
        <p className="erro-msg-modal">{erroCarregar}</p>
        <button className="btn btn-ghost" onClick={() => router.push("/")}>← Voltar para meus calendários</button>
      </div>
    );
  }

  const bandas = [0, 1, 2, 3];

  return (
    <div className="app-shell">
      {/* HEADER EM LINHA ÚNICA (Requisito 2 e 5) */}
      <header className="app-header app-header-single-row">
        <div className="header-single-left">
          {calendarioId && <button className="lobby-back" onClick={() => router.push("/")}>← Voltar</button>}
          <input
            className="nome-calendario-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Calendário sem título"
            disabled={!podeEditar}
          />
        </div>

        <div className="header-single-center">
          <label className="field-inline-compact">
            <span>Ano:</span>
            <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} disabled={!podeEditar} />
          </label>
          <label className="field-inline-compact">
            <span>Campus:</span>
            <input type="text" value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="Campus" disabled={!podeEditar} />
          </label>
          <label className="field-inline-compact">
            <span>Tipo:</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!podeEditar}>
              {Object.entries(CONFIG_TIPO).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </label>
          <div className="status-salvamento-badge">
            {podeEditar ? (
              <>
                <span className={"status-dot status-" + statusSalvamento} />
                <span>{STATUS_LABEL[statusSalvamento]}</span>
              </>
            ) : (
              <span className="papel-badge">{PAPEL_LABEL[papel]}</span>
            )}
            {colaboradoresOnline > 1 && (
              <span className="colaboradores-badge">👥 {colaboradoresOnline}</span>
            )}
          </div>
        </div>

        <div className="header-single-right">
          <button className="btn btn-header-white" onClick={() => setDialogoAberto("compartilhar")} title="Compartilhar por e-mail">
            <i className="fa-solid fa-share-nodes"></i> Compartilhar
          </button>
          {calendarioId && (
            <button className="btn btn-header-white" onClick={() => setDialogoAberto("historico")} title="Histórico de versões">
              <i className="fa-solid fa-clock-rotate-left"></i> Histórico
            </button>
          )}
          <button className="btn btn-header-white" onClick={duplicar} disabled={duplicando} title="Duplicar calendário">
            <i className="fa-solid fa-copy"></i> {duplicando ? "Duplicando..." : "Duplicar"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportar} disabled={exportando}>
            <i className="fa-solid fa-file-excel"></i> {exportando ? "Gerando..." : "Exportar Excel"}
          </button>
          <div className="usuario-chip usuario-chip-header">
            {avatarUrl && <img src={avatarUrl} alt="" className="usuario-avatar" />}
            <button className="btn btn-ghost btn-sm btn-white-text" onClick={sair}>Sair</button>
          </div>
        </div>
      </header>
      {erroExport && <p className="erro-msg" style={{ padding: "0 28px" }}>{erroExport}</p>}

      {/* BODY COM TOOLBAR LATERAL FIXA ESTILO SKETCHUP (Requisito 3) */}
      <div className="app-body app-body-with-side-toolbar">
        {podeEditar && (
          <Toolbar ferramentaAtiva={ferramentaAtiva} onSelecionar={setFerramentaAtiva} tipoCalendario={tipo} />
        )}

        <div className={"calendar-column" + (ferramentaAtiva ? " modo-pintura" : "") + (!podeEditar ? " somente-leitura" : "")}>
          {bandas.map((banda) => (
            <div className="month-band" key={banda}>
              {[0, 1, 2].map((i) => {
                const mes = banda * 3 + i + 1;
                return (
                  <MonthGrid
                    key={mes}
                    ano={ano}
                    mes={mes}
                    dias={dias}
                    tipoCalendario={tipo}
                    atividades={atividades}
                    anotacoesPorDia={anotacoesPorDia}
                    onDayMouseDown={handleDayMouseDown}
                    onDayMouseEnter={handleDayMouseEnter}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <aside className="side-column">
          <ValidationPanel validacao={validacao} />
          <AtividadesPanel
            atividades={atividades}
            somenteLeitura={!podeEditar}
            onAdd={(item) => {
              setAtividades((p) => [...p, item]);
              if (item.contaComoLetivo) marcarComoLetivo(item.dataInicio, item.dataFim, categoriaInfo(item.categoria).label);
            }}
            onRemove={(id) => setAtividades((p) => p.filter((x) => x.id !== id))}
          />
          <ComentariosPanel endpointBase={endpointBase} podeComentar={podeComentar} />
        </aside>
      </div>

      <section className="resumo-periodos">
        <h2>Resumo por período — dias comuns e sábados letivos</h2>
        <p className="resumo-hint">
          Para cada período, quantos dias de cada dia da semana vêm de aula normal ("Comum") e quantos vêm de sábado letivo,
          mês a mês. A última coluna deve fechar com a meta de dias letivos do período.
        </p>
        <div className="resumo-grid">
          {resumosPeriodo.map(({ periodo, resumo }) => (
            <PeriodSummaryTable key={periodo.indice} periodo={periodo} resumo={resumo} />
          ))}
        </div>
      </section>

      {selecionado && podeEditar && (
        <DayPopover
          dateKey={selecionado}
          info={dias[selecionado]}
          tipoCalendario={tipo}
          onClose={() => setSelecionado(null)}
          onSave={(novo) => salvarDia(selecionado, novo)}
        />
      )}

      {dialogoAberto === "compartilhar" && (
        <ShareDialog calendarioId={calendarioId} onClose={() => setDialogoAberto(null)} />
      )}
      {dialogoAberto === "historico" && calendarioId && (
        <HistoricoModal
          calendarioId={calendarioId}
          onClose={() => setDialogoAberto(null)}
          onRestaurado={(dados) => aplicarEstadoCompleto(dados)}
        />
      )}

      {diaSabadoPendente && (
        <div className="modal-overlay" onClick={() => setDiaSabadoPendente(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Sábado Letivo</h3>
            <p>A qual dia da semana este sábado letivo se refere?</p>
            <div className="dialog-button-grid">
              {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"].map((label, idx) => (
                <button key={idx} className="btn btn-secondary btn-full" onClick={() => confirmarSabadoLetivo(idx)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm btn-full mt-12" onClick={() => setDiaSabadoPendente(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {diaConselhoPendente && (
        <div className="modal-overlay" onClick={() => setDiaConselhoPendente(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Conselho de Classe</h3>
            <p>Selecione a categoria do Conselho de Classe:</p>
            <div className="dialog-button-grid">
              {[
                "Conselho Pedagógico (1º Bimestre)",
                "Conselho Pedagógico (2º Bimestre)",
                "Conselho Pedagógico (3º Bimestre)",
                "Conselho Pedagógico (4º Bimestre)",
                "Conselho Final",
              ].map((label, idx) => (
                <button key={idx} className="btn btn-primary btn-full" style={{ background: "#B45F06", borderColor: "#8A4703", color: "#FFFFFF" }} onClick={() => confirmarConselho(label)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm btn-full mt-12" onClick={() => setDiaConselhoPendente(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
