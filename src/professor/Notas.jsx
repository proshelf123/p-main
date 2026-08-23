import { useEffect, useState } from "react";
import { buscarTurmas, buscarAlunos, buscarNotasDaTurma, salvarNotaAluno } from "../firebase/estrutura";

const BIMESTRES = [
  { key: "bimestre1", label: "1º Bim." },
  { key: "bimestre2", label: "2º Bim." },
  { key: "bimestre3", label: "3º Bim." },
  { key: "bimestre4", label: "4º Bim." },
];

export default function Notas({ uid, professor }) {
  const isCoordenador = professor?.role === "coordenador";
  const [turmas, setTurmas] = useState([]);
  const [turmaSel, setTurmaSel] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [notas, setNotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => { carregarTurmas(); }, [uid]);
  useEffect(() => { if (turmaSel) carregarTurma(); }, [turmaSel]);

  async function carregarTurmas() {
    setLoading(true);
    try {
      const lista = await buscarTurmas(uid, professor);
      setTurmas(lista);
      if (lista.length > 0) setTurmaSel(lista[0]);
    } catch {
      setErro("Não foi possível carregar as turmas.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarTurma() {
    setErro(""); setMensagem("");
    const ownerUid = turmaSel.ownerUid || uid;
    try {
      const [listaAlunos, notasExistentes] = await Promise.all([
        buscarAlunos(ownerUid, turmaSel.id),
        buscarNotasDaTurma(ownerUid, turmaSel.id),
      ]);
      setAlunos(listaAlunos);
      const inicial = {};
      listaAlunos.forEach((a) => {
        inicial[a.id] = notasExistentes[a.id]?.notas || {};
      });
      setNotas(inicial);
    } catch {
      setErro("Não foi possível carregar as notas desta turma.");
    }
  }

  function handleNota(alunoId, bimestre, valor) {
    setNotas((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [bimestre]: valor },
    }));
  }

  async function salvarTudo() {
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const ownerUid = turmaSel.ownerUid || uid;
      await Promise.all(
        alunos.map((a) => salvarNotaAluno(ownerUid, turmaSel.id, a.id, notas[a.id] || {}, uid))
      );
      setMensagem("Notas salvas com sucesso.");
    } catch {
      setErro("Erro ao salvar notas.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="secao-vazia">Carregando...</p>;
  if (turmas.length === 0) return <p className="secao-vazia">Nenhuma turma disponível.</p>;

  return (
    <div className="card">
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
        {isCoordenador ? "Notas por turma" : "Lançar notas"}
      </h2>

      <div className="perfil-grupo" style={{ maxWidth: 320, marginBottom: 16 }}>
        <label className="perfil-label">Turma</label>
        <select
          className="perfil-input"
          value={turmaSel?.id || ""}
          onChange={(e) => setTurmaSel(turmas.find((t) => t.id === e.target.value))}
        >
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.disciplina} · {t.nome}</option>
          ))}
        </select>
      </div>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}
      {mensagem && <p style={{ color: "#047857", fontSize: 12 }}>{mensagem}</p>}

      {alunos.length === 0 ? (
        <p className="secao-vazia">Nenhum aluno cadastrado nesta turma ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, color: "var(--texto-sec)" }}>Aluno</th>
                {BIMESTRES.map((b) => (
                  <th key={b.key} style={{ padding: 8, color: "var(--texto-sec)" }}>{b.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--borda)" }}>
                  <td style={{ padding: 8, color: "var(--texto)" }}>
                    {a.numero ? `${a.numero} · ` : ""}{a.nome}
                  </td>
                  {BIMESTRES.map((b) => (
                    <td key={b.key} style={{ padding: 8, textAlign: "center" }}>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        disabled={isCoordenador}
                        className="perfil-input"
                        style={{ width: 64, textAlign: "center", padding: "6px 4px" }}
                        value={notas[a.id]?.[b.key] ?? ""}
                        onChange={(e) => handleNota(a.id, b.key, e.target.value)}
                      />
                    </td>
                  ))}
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