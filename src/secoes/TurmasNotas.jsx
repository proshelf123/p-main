import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { 
  buscarAlunos, 
  buscarNotasDaTurma, 
  salvarNotaAluno, 
  buscarConfiguracoesEscola 
} from "../firebase/estrutura";

// Helper para gerar as colunas com base no sistema da escola
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
      return [
        { key: "periodo_1", label: "Nota Final" }
      ];
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

export default function TurmaNotas({ turma, uid, professor }) {
  const isCoordenador = professor?.role === "coordenador";
  
  const [alunos, setAlunos] = useState([]);
  const [notas, setNotas] = useState({});
  const [config, setConfig] = useState(null); // Receberá as configs da escola
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const NOTAS_ETEC = ["MB", "B", "R", "I"];
const NOTAS_LETRAS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

  useEffect(() => { carregar(); }, [turma?.id]);

  async function carregar() {
    if (!turma) return;
    setLoading(true);
    setErro(""); setMensagem("");
    const ownerUid = turma.ownerUid || uid;
    
    try {
      // 1. Buscamos alunos, notas e as CONFIGURAÇÕES GERAIS da escola de uma vez
      const [listaAlunos, notasExistentes, configEscola] = await Promise.all([
        buscarAlunos(uid, turma.nome), 
        buscarNotasDaTurma(ownerUid, turma.id),
        buscarConfiguracoesEscola(uid)
      ]);
      
      setConfig(configEscola);
      setAlunos(listaAlunos);
      
      const inicial = {};
      listaAlunos.forEach((a) => {
        inicial[a.id] = notasExistentes[a.id]?.notas || {};
      });
      setNotas(inicial);
      
    } catch {
      setErro("Não foi possível carregar os dados das notas.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Calcula se o período está bloqueado com base na data de hoje
  function isPeriodoBloqueado(periodoKey) {
    if (!config || !config.datasPeriodos || !config.datasPeriodos[periodoKey]) return false;
    
    const { inicio, fim } = config.datasPeriodos[periodoKey];
    if (!inicio && !fim) return false; // Se o coordenador deixou em branco, é aberto

    // Formata o dia de hoje em YYYY-MM-DD para comparar de forma exata com o input HTML
    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (inicio && hojeStr < inicio) return true; // Ainda não abriu
    if (fim && hojeStr > fim) return true;       // Já fechou

    return false;
  }

  function handleNota(alunoId, periodoKey, valor) {
    setNotas((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [periodoKey]: valor },
    }));
  }

  async function salvarTudo() {
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const ownerUid = turma.ownerUid || uid;
      await Promise.all(
        alunos.map((a) => salvarNotaAluno(ownerUid, turma.id, a.id, notas[a.id] || {}, uid))
      );
      setMensagem("Notas salvas com sucesso.");
    } catch {
      setErro("Erro ao salvar notas.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="secao-vazia">Carregando notas...</p>;

  // Puxa as colunas dinamicamente baseado no sistema escolhido pelo coordenador
  const periodos = obterPeriodos(config?.sistemaAvaliacao || "bimestral");

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: "var(--texto)" }}>
        {isCoordenador ? "Visualizar notas" : "Lançar notas"}
      </h3>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}
      {mensagem && <p style={{ color: "#047857", fontSize: 12 }}>{mensagem}</p>}

      {alunos.length === 0 ? (
        <p className="secao-vazia">
          {isCoordenador ? "Nenhum aluno cadastrado nesta turma ainda." : "A coordenação ainda não cadastrou alunos nesta turma."}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: "var(--texto-sec)", borderBottom: "2px solid var(--borda)" }}>Aluno</th>
                
                {/* 3. Cabeçalho dinâmico com aviso de bloqueio */}
                {periodos.map((p) => {
                  const bloqueado = isPeriodoBloqueado(p.key);
                  return (
                    <th key={p.key} style={{ padding: 8, color: "var(--texto-sec)", borderBottom: "2px solid var(--borda)", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {bloqueado && !isCoordenador && <Lock size={12} color="#ED235C" title="Período fechado" />}
                        {p.label}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                  <td style={{ padding: 8, color: "var(--texto)" }}>
                    {a.numero ? <span style={{ color: "var(--texto-sec)", fontWeight: 600 }}>{a.numero} · </span> : ""}{a.nome}
                  </td>
                  
                  {/* 4. Inputs gerados de acordo com os períodos e os bloqueios */}
{/* 4. Inputs gerados de acordo com o Formato de Nota da Escola */}
                  {periodos.map((p) => {
                    const bloqueado = isPeriodoBloqueado(p.key);
                    const tipoNota = config?.tipoNota || "numerica";
                    const valorAtual = notas[a.id]?.[p.key] ?? "";

                    return (
                      <td key={p.key} style={{ padding: 8, textAlign: "center" }}>
                        
                        {tipoNota === "numerica" ? (
                          /* RENDERIZA INPUT NUMÉRICO TRADICIONAL */
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            disabled={isCoordenador || bloqueado}
                            className="perfil-input"
                            title={bloqueado && !isCoordenador ? "Período fechado para lançamentos" : ""}
                            style={{ 
                              width: 64, 
                              textAlign: "center", 
                              padding: "6px 4px",
                              opacity: bloqueado && !isCoordenador ? 0.5 : 1,
                              cursor: bloqueado ? "not-allowed" : "text",
                              background: bloqueado ? "var(--bg)" : "var(--branco)" 
                            }}
                            value={valorAtual}
                            onChange={(e) => handleNota(a.id, p.key, e.target.value)}
                          />
                        ) : (
                          /* RENDERIZA DROPDOWN DE CONCEITOS / LETRAS */
                          <select
                            disabled={isCoordenador || bloqueado}
                            className="perfil-input"
                            title={bloqueado && !isCoordenador ? "Período fechado para lançamentos" : ""}
                            style={{ 
                              width: 74,
                              textAlign: "center",
                              padding: "6px 20px 6px 8px", // Espaço extra na direita para a setinha do select
                              opacity: bloqueado && !isCoordenador ? 0.5 : 1,
                              cursor: bloqueado ? "not-allowed" : "pointer",
                              background: bloqueado ? "var(--bg)" : "var(--branco)",
                              appearance: "none"
                            }}
                            value={valorAtual}
                            onChange={(e) => handleNota(a.id, p.key, e.target.value)}
                          >
                            <option value="">-</option>
                            
                            {/* Renderiza as opções dependendo do tipo */}
                            {(tipoNota === "etec" ? NOTAS_ETEC : NOTAS_LETRAS).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {!isCoordenador && (
            <button className="perfil-salvar" style={{ marginTop: 16, maxWidth: 220 }} onClick={salvarTudo} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar notas"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}