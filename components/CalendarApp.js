"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CONFIG_TIPO, pyWeekday, keyToDate, enumerarIntervalo, categoriaInfo } from "../lib/constants";
import { buildEffectiveDias } from "../lib/effective";
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
  erro: "Não foi possível salvar — tentando de novo",
};

const PAPEL_LABEL = {
  editor: null, // não mostra selo — é o modo padrão
  comentador: "Você está comentando (não pode editar o calendário)",
  visualizador: "Somente visualização",
};

export default function CalendarApp({ calendarioId, token }) {
  const router = useRouter();
  const { nome: meuNome, avatarUrl, sair } = useAuthContext();
  const {
    carregando, erroCarregar, statusSalvamento, colaboradoresOnline, papel, podeEditar, tokens,
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

  useEffect(() => {
    function onUp() { pintandoRef.current = false; }
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
    setOverrides((prev) => {
      const next = { ...prev };
      if (novo.limpar) delete next[key];
      else next[key] = { tipo: novo.tipo, contaComo: novo.contaComo, rotulo: novo.rotulo };
      return next;
    });
    setMarcosPorDia((prev) => {
      const next = { ...prev };
      if (novo.limpar || !novo.marcos || novo.marcos.length === 0) delete next[key];
      else next[key] = novo.marcos;
      return next;
    });
    if (!novo.limpar && novo.addAtividade) {
      setAtividades((p) => [...p, { id: crypto.randomUUID(), ...novo.addAtividade }]);
      if (novo.addAtividade.contaComoLetivo) {
        marcarComoLetivo(novo.addAtividade.dataInicio, novo.addAtividade.dataFim, categoriaInfo(novo.addAtividade.categoria).label);
      }
    }
    setSelecionado(null);
  }, [podeEditar, marcarComoLetivo, setOverrides, setMarcosPorDia, setAtividades]);

  const aplicarFerramenta = useCallback((key) => {
    if (!podeEditar || !ferramentaAtiva) return;
    if (ferramentaAtiva.kind === "tipo") {
      setOverrides((prev) => ({
        ...prev,
        [key]: { tipo: ferramentaAtiva.tipo, contaComo: ferramentaAtiva.contaComo ?? null, rotulo: null },
      }));
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
        return next;
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
  }, [podeEditar, ferramentaAtiva, marcarComoLetivo, setOverrides, setMarcosPorDia, setAtividades]);

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
      <header className="app-header">
        <div className="app-header-title">
          {calendarioId && <button className="lobby-back" onClick={() => router.push("/")}>← Meus calendários</button>}
          <input
            className="nome-calendario-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Calendário sem título"
            disabled={!podeEditar}
          />
          <div className="status-salvamento">
            {podeEditar ? (
              <>
                <span className={"status-dot status-" + statusSalvamento} />
                {STATUS_LABEL[statusSalvamento]}
              </>
            ) : (
              <span className="papel-badge">{PAPEL_LABEL[papel]}</span>
            )}
            {colaboradoresOnline > 1 && (
              <span className="colaboradores-badge">👥 {colaboradoresOnline} pessoas por aqui</span>
            )}
          </div>
        </div>
        <div className="app-header-controls">
          <label className="field field-inline">
            <span>Ano</span>
            <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} disabled={!podeEditar} />
          </label>
          <label className="field field-inline">
            <span>Campus</span>
            <input type="text" value={campus} onChange={(e) => setCampus(e.target.value)} disabled={!podeEditar} />
          </label>
          <label className="field field-inline">
            <span>Tipo de calendário</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!podeEditar}>
              {Object.entries(CONFIG_TIPO).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </label>
          {tokens && (
            <button className="btn btn-ghost" onClick={() => setDialogoAberto("compartilhar")}>
              🔗 Compartilhar
            </button>
          )}
          {calendarioId && (
            <button className="btn btn-ghost" onClick={() => setDialogoAberto("historico")}>
              🕑 Histórico
            </button>
          )}
          <button className="btn btn-ghost" onClick={duplicar} disabled={duplicando}>
            {duplicando ? "Duplicando..." : "Duplicar"}
          </button>
          <button className="btn btn-primary" onClick={exportar} disabled={exportando}>
            {exportando ? "Gerando..." : "Exportar para Excel"}
          </button>
          <div className="usuario-chip usuario-chip-header">
            {avatarUrl && <img src={avatarUrl} alt="" className="usuario-avatar" />}
            <span>{meuNome}</span>
            <button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
          </div>
        </div>
        {erroExport && <p className="erro-msg">{erroExport}</p>}
      </header>

      {podeEditar && <Toolbar ferramentaAtiva={ferramentaAtiva} onSelecionar={setFerramentaAtiva} tipoCalendario={tipo} />}

      <div className="app-body">
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
        <ShareDialog tokens={tokens} onClose={() => setDialogoAberto(null)} />
      )}
      {dialogoAberto === "historico" && calendarioId && (
        <HistoricoModal
          calendarioId={calendarioId}
          onClose={() => setDialogoAberto(null)}
          onRestaurado={(dados) => aplicarEstadoCompleto(dados)}
        />
      )}
    </div>
  );
}
