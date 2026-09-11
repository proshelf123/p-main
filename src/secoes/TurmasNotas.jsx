import { useEffect, useState } from "react";
import {
  buscarAlunos,
  buscarAvaliacoes,
  buscarNotasDetalhadasDaTurma,
  buscarConfiguracoesEscola,
} from "../firebase/estrutura";
import { calcularTotalPeriodo } from "../professor/notas";
import { SkeletonTable } from "./Skeleton";

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

export default function TurmaNotas({ turma, uid, professor }) {
  const [alunos, setAlunos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [notasDetalhadas, setNotasDetalhadas] = useState({});
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
  }, [turma?.id]);

async function carregar() {
  if (!turma) return;
  setLoading(true);
  setErro("");
  const ownerUid = turma.ownerUid || uid;

  try {
    const listaAlunos = await buscarAlunos(uid, turma.nome);
    const listaAvaliacoes = await buscarAvaliacoes(ownerUid, turma.id);
    const notas = await buscarNotasDetalhadasDaTurma(ownerUid, turma.id);
    const configEscola = await buscarConfiguracoesEscola(uid);

    setAlunos(listaAlunos);
    setAvaliacoes(listaAvaliacoes);
    setNotasDetalhadas(notas);
    setConfig(configEscola);
  } catch (e) {
    console.error("Erro ao carregar notas:", e);
    setErro("Não foi possível carregar os dados das notas.");
  } finally {
    setLoading(false);
  }
}

  if (loading)
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--texto)" }}>
          Visualizar notas
        </h3>
        <SkeletonTable linhas={5} colunas={4} />
      </div>
    );

  const tipoNota = config?.tipoNota || "numerica";
  const periodos = obterPeriodos(config?.sistemaAvaliacao || "bimestral");

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px", color: "var(--texto)" }}>
        Visualizar notas
      </h3>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}

      {alunos.length === 0 ? (
        <p className="secao-vazia">Nenhum aluno cadastrado nesta turma ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: "var(--texto-sec)", borderBottom: "2px solid var(--borda)" }}>
                  Aluno
                </th>
                {periodos.map((p) => (
                  <th
                    key={p.key}
                    style={{ padding: 8, color: "var(--texto-sec)", borderBottom: "2px solid var(--borda)", textAlign: "center" }}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const notasDoAluno = notasDetalhadas[a.id] || {};
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--borda)" }}>
                    <td style={{ padding: 8, color: "var(--texto)" }}>
                      {a.numero ? <span style={{ color: "var(--texto-sec)", fontWeight: 600 }}>{a.numero} · </span> : ""}
                      {a.nome}
                    </td>
                    {periodos.map((p) => {
                      const avaliacoesDoPeriodo = avaliacoes.filter((av) => av.periodo === p.key);
                      const notasDoPeriodo = {};
                      avaliacoesDoPeriodo.forEach((av) => {
                        if (notasDoAluno[av.id] != null && notasDoAluno[av.id] !== "") {
                          notasDoPeriodo[av.id] = notasDoAluno[av.id];
                        }
                      });
                      const total = calcularTotalPeriodo(notasDoPeriodo, tipoNota);

                      return (
                        <td key={p.key} style={{ padding: 8, textAlign: "center", fontWeight: 600, color: "var(--texto)" }}>
                          {total ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}