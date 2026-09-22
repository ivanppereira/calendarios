import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "./supabaseClient";
import { mesclarDicionario, mesclarAtividades, mesclarEscalar } from "./mergeRemoto";
import { apiFetch } from "./apiFetch";
import { useAuth } from "./useAuth";

const DEBOUNCE_MS = 700;

// Um dos dois deve ser informado: calendarioId (acesso "dono", papel sempre
// "editor") OU token (acesso compartilhado, o papel vem do servidor).
export function useCalendarioColaborativo({ calendarioId, token }) {
  const { nome: meuNome } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(null);
  const [statusSalvamento, setStatusSalvamento] = useState("sincronizado"); // sincronizado | salvando | erro
  const [colaboradoresOnline, setColaboradoresOnline] = useState(1);
  const [papel, setPapel] = useState(calendarioId ? "editor" : null);

  const [nome, setNome] = useState("");
  const [ano, setAno] = useState(2027);
  const [tipo, setTipo] = useState("superior");
  const [campus, setCampus] = useState("");
  const [overrides, setOverrides] = useState({});
  const [marcosPorDia, setMarcosPorDia] = useState({});
  const [atividades, setAtividades] = useState([]);
  const [tokens, setTokens] = useState(null); // {editor, comentador, visualizador} — só no modo "dono"

  const endpointBase = calendarioId ? `/api/calendarios/${calendarioId}` : `/api/compartilhado/${token}`;

  // refs para os timers/estado usados dentro de callbacks e do listener do Realtime,
  // sem precisar recriar a subscrição a cada renderização
  const saveTimerRef = useRef(null);
  const carregouRef = useRef(false);
  const estadoRef = useRef({});
  estadoRef.current = { nome, ano, tipo, campus, overrides, marcos: marcosPorDia, atividades };
  const aplicandoRemotoRef = useRef(false);

  const podeEditar = papel === "editor";

  // ---------------- carregamento inicial ----------------
  useEffect(() => {
    let cancelado = false;
    carregouRef.current = false;
    setCarregando(true);
    setErroCarregar(null);
    (async () => {
      try {
        const resp = await apiFetch(endpointBase);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Calendário não encontrado");
        if (cancelado) return;
        const c = data.calendario;
        setNome(c.nome || "");
        setAno(c.ano);
        setTipo(c.tipo);
        setCampus(c.campus || "");
        setOverrides(c.overrides || {});
        setMarcosPorDia(c.marcos || {});
        setAtividades(c.atividades || []);
        if (calendarioId) {
          setPapel("editor");
          setTokens({ editor: c.token_editor, comentador: c.token_comentador, visualizador: c.token_visualizador });
        } else {
          setPapel(c.papel);
        }
        carregouRef.current = true;
      } catch (e) {
        if (!cancelado) setErroCarregar(e.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarioId, token]);

  // ---------------- autosave (debounced) — só quem tem papel "editor" salva ----------------
  useEffect(() => {
    if (!carregouRef.current || aplicandoRemotoRef.current || !podeEditar) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setStatusSalvamento("salvando");
      try {
        const resp = await apiFetch(endpointBase, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(estadoRef.current),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Falha ao salvar");
        setStatusSalvamento("sincronizado");
      } catch {
        setStatusSalvamento("erro");
      }
    }, DEBOUNCE_MS);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, ano, tipo, campus, overrides, marcosPorDia, atividades, endpointBase, podeEditar]);

  // ---------------- tempo real: aplica mudanças de outros editores ----------------
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    // no modo por token, só dá pra assinar depois que o papel (e portanto a
    // coluna de token certa) já foi resolvido pelo carregamento inicial
    if (!supabase || (!calendarioId && !papel)) return;

    const filtro = calendarioId ? `id=eq.${calendarioId}` : `token_${papel}=eq.${token}`;
    const canal = supabase.channel(`calendario-${calendarioId || token}`, {
      config: { presence: { key: `${Date.now()}-${Math.random().toString(36).slice(2)}` } },
    });

    canal.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "calendarios", filter: filtro },
      ({ old: antigo, new: novo }) => {
        aplicandoRemotoRef.current = true;
        const r1 = mesclarDicionario(estadoRef.current.overrides, antigo.overrides, novo.overrides);
        if (r1.mudou) setOverrides(r1.valor);
        const r2 = mesclarDicionario(estadoRef.current.marcos, antigo.marcos, novo.marcos);
        if (r2.mudou) setMarcosPorDia(r2.valor);
        const r3 = mesclarAtividades(estadoRef.current.atividades, antigo.atividades, novo.atividades);
        if (r3.mudou) setAtividades(r3.valor);
        const r4 = mesclarEscalar(estadoRef.current.nome, antigo.nome, novo.nome);
        if (r4.mudou) setNome(r4.valor);
        const r5 = mesclarEscalar(estadoRef.current.ano, antigo.ano, novo.ano);
        if (r5.mudou) setAno(r5.valor);
        const r6 = mesclarEscalar(estadoRef.current.tipo, antigo.tipo, novo.tipo);
        if (r6.mudou) setTipo(r6.valor);
        const r7 = mesclarEscalar(estadoRef.current.campus, antigo.campus, novo.campus);
        if (r7.mudou) setCampus(r7.valor);
        if (calendarioId) {
          setTokens({ editor: novo.token_editor, comentador: novo.token_comentador, visualizador: novo.token_visualizador });
        }
        // libera o autosave de novo no próximo tick (a mudança acima não deve dar re-save)
        setTimeout(() => { aplicandoRemotoRef.current = false; }, 0);
      }
    );

    canal.on("presence", { event: "sync" }, () => {
      const estado = canal.presenceState();
      const total = Object.values(estado).reduce((acc, arr) => acc + arr.length, 0);
      setColaboradoresOnline(Math.max(1, total));
    });

    canal.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await canal.track({ entrou_em: new Date().toISOString(), nome: meuNome || "Alguém" });
      }
    });

    return () => { supabase.removeChannel(canal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarioId, token, papel]);

  // Usado para aplicar de uma vez um estado completo vindo de fora (ex.: ao
  // restaurar uma versão do histórico), sem esperar o ciclo normal de merge.
  const aplicarEstadoCompleto = useCallback((dados) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    aplicandoRemotoRef.current = true;
    setNome(dados.nome || "");
    setAno(dados.ano);
    setTipo(dados.tipo);
    setCampus(dados.campus || "");
    setOverrides(dados.overrides || {});
    setMarcosPorDia(dados.marcos || {});
    setAtividades(dados.atividades || []);
    setTimeout(() => { aplicandoRemotoRef.current = false; }, 0);
  }, []);

  return {
    carregando, erroCarregar, statusSalvamento, colaboradoresOnline, papel, podeEditar, tokens,
    nome, setNome, ano, setAno, tipo, setTipo, campus, setCampus,
    overrides, setOverrides, marcosPorDia, setMarcosPorDia, atividades, setAtividades,
    aplicarEstadoCompleto,
  };
}
