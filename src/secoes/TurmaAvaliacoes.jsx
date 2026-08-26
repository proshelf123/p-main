import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus } from "lucide-react";
import {
  buscarAlunos,
  buscarAvaliacoes,
  criarAvaliacao,
  excluirAvaliacao,
  buscarNotasDetalhadasDaTurma,
  salvarNotaAvaliacao,
  buscarConfiguracoesEscola,
} from "../firebase/estrutura";
import { NOTAS_ETEC, NOTAS_LETRAS } from "../professor/notas";
import DropdownComPortal from "../secoes/DropwdownComPortal"; // ajuste o caminho

const obterPeriodos = (sistema) => {
  switch (sistema) {
    case "trimestral":
      return [
        { key: "periodo_1", label: "1º Tri." },
        { key: "periodo_2", label: "2º Tri." },
        { key: "periodo_3", label: "3º Tri." },
      ];
    case "semestral":
      return [
        { key: "periodo_1", label: "1º Sem." },
        { key: "periodo_2", label: "2º Sem." },
      ];
    case "livre":
      return [{ key: "periodo_1", label: "Nota Final" }];
    case "bimestral":
    default:
      return [
        { key: "periodo_1", label: "1º Bim." },
        { key: "periodo_2", label: "2º Bim." },
        { key: "periodo_3", label: "3º Bim." },
        { key: "periodo_4", label: "4º Bim." },
      ];
  }
};

const OPCOES_TIPO = [
  { valor: "prova", label: "Prova" },
  { valor: "trabalho", label: "Trabalho" },
  { valor: "apresentacao", label: "Apresentação" },
  { valor: "atividade", label: "Atividade" },
];

export default function TurmaAvaliacoes({ turma, uid, professor }) {
  const isCoordenador = professor?.role === "coordenador";

  const [alunos, setAlunos] = useState([]);
  const [config, setConfig] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notasDetalhadas, setNotasDetalhadas] = useState({});
  const [periodoAtivo, setPeriodoAtivo] = useState(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("prova");
  const [criando, setCriando] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  // Estado compartilhado entre TODOS os dropdowns dessa tela (novo tipo + notas de conceito por célula)
  const [dropdownAberto, setDropdownAberto] = useState(null);

  useEffect(() => {
    carregar();
  }, [turma?.id]);

  async function carregar() {
    if (!turma) return;
    setLoading(true);
    setErro("");
    setMensagem("");
    const ownerUid = turma.ownerUid || uid;

    try {
      const [listaAlunos, configEscola, listaAvaliacoes, notas] = await Promise.all([
        buscarAlunos(uid, turma.nome),
        buscarConfiguracoesEscola(uid),
        buscarAvaliacoes(ownerUid, turma.id),
        buscarNotasDetalhadasDaTurma(ownerUid, turma.id),
      ]);

      setAlunos(listaAlunos);
      setConfig(configEscola);
      setAvaliacoes(listaAvaliacoes);
      setNotasDetalhadas(notas);

      const periodos = obterPeriodos(configEscola?.sistemaAvaliacao || "bimestral");
      setPeriodoAtivo((atual) => atual || periodos[0].key);
    } catch (e) {
      console.error("Erro ao carregar avaliações:", e);
      setErro("Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarAvaliacao() {
    if (!novoNome.trim() || !periodoAtivo) return;
    setCriando(true);
    setErro("");
    try {
      const ownerUid = turma.ownerUid || uid;
      const id = await criarAvaliacao(ownerUid, turma.id, {
        nome: novoNome.trim(),
        periodo: periodoAtivo,
        tipo: novoTipo,
        uid,
      });
      setAvaliacoes((prev) => [
        ...prev,
        { id, nome: novoNome.trim(), periodo: periodoAtivo, tipo: novoTipo, criadoEm: Date.now() },
      ]);
      setNovoNome("");
    } catch (e) {
      console.error("Erro ao criar avaliação:", e);
      setErro("Erro ao criar avaliação.");
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluirAvaliacao(avaliacaoId) {
    const ownerUid = turma.ownerUid || uid;
    try {
      await excluirAvaliacao(
        ownerUid,
        turma.id,
        avaliacaoId,
        alunos.map((a) => a.id)
      );
      setAvaliacoes((prev) => prev.filter((av) => av.id !== avaliacaoId));
      setNotasDetalhadas((prev) => {
        const copia = { ...prev };
        Object.keys(copia).forEach((alunoId) => {
          const { [avaliacaoId]: _removida, ...resto } = copia[alunoId] || {};
          copia[alunoId] = resto;
        });
        return copia;
      });
    } catch (e) {
      console.error("Erro ao excluir avaliação:", e);
      setErro("Erro ao excluir avaliação.");
    }
  }

  function handleNota(alunoId, avaliacaoId, valor) {
    setNotasDetalhadas((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [avaliacaoId]: valor },
    }));
  }

  async function salvarTudo() {
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const ownerUid = turma.ownerUid || uid;
      const avaliacoesDoPeriodo = avaliacoes.filter((av) => av.periodo === periodoAtivo);

      const operacoes = [];
      alunos.forEach((a) => {
        avaliacoesDoPeriodo.forEach((av) => {
          const valor = notasDetalhadas[a.id]?.[av.id];
          if (valor !== undefined) {
            operacoes.push(salvarNotaAvaliacao(ownerUid, turma.id, a.id, av.id, valor, uid));
          }
        });
      });

      await Promise.all(operacoes);
      setMensagem("Notas salvas com sucesso.");
    } catch (e) {
      console.error("Erro ao salvar notas:", e);
      setErro("Erro ao salvar notas.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="secao-vazia">Carregando avaliações...</p>;
  if (isCoordenador)
    return <p className="secao-vazia">Somente professores lançam avaliações.</p>;

  const periodos = obterPeriodos(config?.sistemaAvaliacao || "bimestral");
  const tipoNota = config?.tipoNota || "numerica";
  const opcoesConceito = (tipoNota === "etec" ? NOTAS_ETEC : NOTAS_LETRAS).map((v) => ({
    valor: v,
    label: v,
  }));
  const avaliacoesDoPeriodo = avaliacoes.filter((av) => av.periodo === periodoAtivo);

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: "var(--texto)" }}>
        Lançar avaliações
      </h3>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}
      {mensagem && <p style={{ color: "#047857", fontSize: 12 }}>{mensagem}</p>}

      {/* Seletor de período — com pílula animada */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {periodos.map((p) => (
          <motion.button
            key={p.key}
            onClick={() => setPeriodoAtivo(p.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              position: "relative",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--borda)",
              background: "transparent",
              color: periodoAtivo === p.key ? "#fff" : "var(--texto)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              overflow: "hidden",
              transition: "color 0.2s ease",
            }}
          >
            {periodoAtivo === p.key && (
              <motion.div
                layoutId="pill-periodo-avaliacoes"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--roxo)",
                  borderRadius: 7,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{p.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Cadastro de nova avaliação */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input
          className="perfil-input"
          placeholder="Nome da avaliação (ex: Prova 1)"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />

        <div style={{ width: 160 }}>
          <DropdownComPortal
            id="novo-tipo-avaliacao"
            opcoes={OPCOES_TIPO}
            valor={novoTipo}
            onChange={setNovoTipo}
            dropdownAberto={dropdownAberto}
            setDropdownAberto={setDropdownAberto}
          />
        </div>

        <motion.button
          onClick={handleCriarAvaliacao}
          disabled={criando || !novoNome.trim()}
          whileHover={{ scale: criando ? 1 : 1.03 }}
          whileTap={{ scale: criando ? 1 : 0.97 }}
          className="perfil-salvar"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "auto", padding: "8px 16px" }}
        >
          <Plus size={14} /> Adicionar
        </motion.button>
      </div>

      {avaliacoesDoPeriodo.length === 0 ? (
        <p className="secao-vazia">Nenhuma avaliação cadastrada para este período ainda.</p>
      ) : alunos.length === 0 ? (
        <p className="secao-vazia">A coordenação ainda não cadastrou alunos nesta turma.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: "var(--texto-sec)", borderBottom: "2px solid var(--borda)" }}>
                  Aluno
                </th>
                {avaliacoesDoPeriodo.map((av) => (
                  <th key={av.id} style={{ padding: 8, borderBottom: "2px solid var(--borda)", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--texto-sec)" }}>{av.nome}</span>
                      <motion.span
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        style={{ display: "inline-flex", cursor: "pointer" }}
                        onClick={() => handleExcluirAvaliacao(av.id)}
                        title="Excluir avaliação"
                      >
                        <Trash2 size={12} color="#c0392b" />
                      </motion.span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                  <td style={{ padding: 8, color: "var(--texto)" }}>
                    {a.numero ? <span style={{ color: "var(--texto-sec)", fontWeight: 600 }}>{a.numero} · </span> : ""}
                    {a.nome}
                  </td>
                  {avaliacoesDoPeriodo.map((av) => {
                    const valorAtual = notasDetalhadas[a.id]?.[av.id] ?? "";
                    const dropdownId = `${a.id}__${av.id}`;

                    return (
                      <td key={av.id} style={{ padding: 8, textAlign: "center" }}>
                        {tipoNota === "numerica" ? (
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            className="perfil-input"
                            style={{ width: 64, textAlign: "center", padding: "6px 4px" }}
                            value={valorAtual}
                            onChange={(e) => handleNota(a.id, av.id, e.target.value)}
                          />
                        ) : (
                          <div style={{ width: 84, display: "inline-block" }}>
                            <DropdownComPortal
                              id={dropdownId}
                              opcoes={opcoesConceito}
                              valor={valorAtual}
                              onChange={(v) => handleNota(a.id, av.id, v)}
                              dropdownAberto={dropdownAberto}
                              setDropdownAberto={setDropdownAberto}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <motion.button
            whileHover={{ scale: salvando ? 1 : 1.02 }}
            whileTap={{ scale: salvando ? 1 : 0.98 }}
            className="perfil-salvar"
            style={{ marginTop: 16, maxWidth: 220 }}
            onClick={salvarTudo}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar notas"}
          </motion.button>
        </div>
      )}
    </div>
  );
}