import { useEffect, useState } from "react";
import { Check, X as XIcon, Clock } from "lucide-react";
import { buscarTurmas, buscarAlunos, buscarPresenca, salvarPresenca } from "../firebase/estrutura";

const STATUS = {
  presente: { label: "Presente", cor: "#0BDB23", icon: Check },
  falta: { label: "Falta", cor: "#ED235C", icon: XIcon },
  atraso: { label: "Atraso", cor: "#FFBB00", icon: Clock },
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Presenca({ uid, professor }) {
  const [turmas, setTurmas] = useState([]);
  const [turmaSel, setTurmaSel] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [data, setData] = useState(hojeISO());
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => { carregarTurmas(); }, [uid]);
  useEffect(() => { if (turmaSel) carregarTurma(); }, [turmaSel, data]);

  async function carregarTurmas() {
    setLoading(true);
    try {
      const lista = await buscarTurmas(uid, professor);
      setTurmas(lista);
      if (lista.length > 0) setTurmaSel(lista[0]);
    } catch {
      setErro("Não foi possível carregar suas turmas.");
    } finally {
      setLoading(false);
    }
  }

async function carregarTurma() {
    setErro(""); setMensagem("");
    const ownerUid = turmaSel.ownerUid || uid;
    try {
      const [listaAlunos, presencaExistente] = await Promise.all([
        buscarAlunos(uid, turmaSel.nome), // <--- MUDANÇA: Usando turmaSel.nome
        buscarPresenca(ownerUid, turmaSel.id, data), // Presença continua no ID da disciplina
      ]);
      setAlunos(listaAlunos);
      const inicial = {};
      listaAlunos.forEach((a) => {
        inicial[a.id] = presencaExistente?.registros?.[a.id] || "presente";
      });
      setStatus(inicial);
    } catch {
      setErro("Não foi possível carregar os alunos desta turma.");
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro(""); setMensagem("");
    try {
      const ownerUid = turmaSel.ownerUid || uid;
      await salvarPresenca(ownerUid, turmaSel.id, data, status, uid);
      setMensagem("Presença salva com sucesso.");
    } catch {
      setErro("Erro ao salvar presença.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="secao-vazia">Carregando...</p>;
  if (turmas.length === 0) return <p className="secao-vazia">Nenhuma turma vinculada a você.</p>;

  return (
    <div className="card">
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>Registrar presença</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="perfil-grupo" style={{ minWidth: 220 }}>
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
        <div className="perfil-grupo">
          <label className="perfil-label">Data</label>
          <input type="date" className="perfil-input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}
      {mensagem && <p style={{ color: "#047857", fontSize: 12 }}>{mensagem}</p>}

      {alunos.length === 0 ? (
        <p className="secao-vazia">Nenhum aluno cadastrado nesta turma ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alunos.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "var(--bg)" }}>
              <span style={{ fontSize: 14, color: "var(--texto)" }}>
                {a.numero ? `${a.numero} · ` : ""}{a.nome}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.entries(STATUS).map(([key, s]) => {
                  const ativo = status[a.id] === key;
                  const Icon = s.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatus((prev) => ({ ...prev, [a.id]: key }))}
                      title={s.label}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "6px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                        background: ativo ? s.cor : "#eee",
                        color: ativo ? "#fff" : "#888",
                        fontSize: 11, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                        transition: "all .15s",
                      }}
                    >
                      <Icon size={12} /> {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button className="perfil-salvar" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar presença"}
          </button>
        </div>
      )}
    </div>
  );
}