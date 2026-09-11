import { useEffect, useState } from "react";
import { Check, X as XIcon, Clock } from "lucide-react";
import { 
  buscarAlunos, 
  buscarPresenca, 
  salvarPresenca, 
  buscarCronograma 
} from "../firebase/estrutura";
import CustomDatePicker from "./dropdown-calendario";
import { SkeletonList } from "./Skeleton";

const STATUS = {
  presente: { label: "Presente", cor: "#0BDB23", icon: Check },
  falta: { label: "Falta", cor: "#ED235C", icon: XIcon },
  atraso: { label: "Atraso", cor: "#FFBB00", icon: Clock },
};

const DIAS_SEMANA = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// NOVA FUNÇÃO: Remove acentos, espaços, º, ª, traços e deixa tudo colado e maiúsculo
// Ex: "3º Informática" vira "3INFORMATICA"
function normalizarAgressivo(str) {
  return String(str || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Z0-9]/g, "");     // Remove tudo que não for letra ou número
}

export default function TurmaPresenca({ turma, uid, professor }) {
  const isCoordenador = professor?.role === "coordenador";
  
  const [alunos, setAlunos] = useState([]);
  const [data, setData] = useState(hojeISO());
  const [status, setStatus] = useState({}); 
  const [aulasNoDia, setAulasNoDia] = useState(1);
  const [dropdownAberto, setDropdownAberto] = useState(null); 
  const [semAulaHoje, setSemAulaHoje] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => { carregar(); }, [turma?.id, data]);

  async function carregar() {
    if (!turma) return;
    setLoading(true); setErro(""); setMensagem("");
    const ownerUid = turma.ownerUid || uid;

    try {
      const [ano, mes, dia] = data.split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia);
      const diaDaSemanaStr = DIAS_SEMANA[dataObj.getDay()];

      const [listaAlunos, presencaExistente, cronogramaProfessor] = await Promise.all([
        buscarAlunos(uid, turma.nome), 
        buscarPresenca(ownerUid, turma.id, data),
        buscarCronograma(uid, professor) 
      ]);

      // Filtro Agressivo para evitar falhas de digitação (espaços, º, acentos)
      const diaNorm = normalizarAgressivo(diaDaSemanaStr);
      const turmaNorm = normalizarAgressivo(turma.nome);
      const discNorm = normalizarAgressivo(turma.disciplina);
      const profNorm = normalizarAgressivo(turma.professor || professor?.nome);

      const aulasHoje = cronogramaProfessor.filter(aula => {
        return normalizarAgressivo(aula.dia) === diaNorm &&
               normalizarAgressivo(aula.turma) === turmaNorm &&
               normalizarAgressivo(aula.disciplina) === discNorm &&
               normalizarAgressivo(aula.professor) === profNorm; // Conta apenas as aulas deste professor!
      });
      if (aulasHoje.length === 0) {
  setSemAulaHoje(true);
  setAlunos([]);
  setStatus({});
  setAulasNoDia(0);
  setLoading(false);
  return;
}
setSemAulaHoje(false);
setAlunos(listaAlunos);

const qtdAulas = aulasHoje.length; // ANTES: Math.max(1, aulasHoje.length)
setAulasNoDia(qtdAulas);

      setAlunos(listaAlunos);
      const inicial = {};
      
      listaAlunos.forEach((a) => {
        const salvo = presencaExistente?.registros?.[a.id];
        let arrayStatus = [];

        if (Array.isArray(salvo)) {
          arrayStatus = [...salvo];
        } else if (typeof salvo === "string") {
          arrayStatus = [salvo];
        }

        while (arrayStatus.length < qtdAulas) {
          arrayStatus.push("presente");
        }
        
        if (arrayStatus.length > qtdAulas) {
          arrayStatus = arrayStatus.slice(0, qtdAulas);
        }

        inicial[a.id] = arrayStatus;
      });
      
      setStatus(inicial);
    } catch(e) {
      console.error(e);
      setErro("Não foi possível carregar os dados para presença.");
    } finally {
      setLoading(false);
    }
  }

  function handleStatusChange(alunoId, slotIndex, novoStatus) {
    setStatus(prev => {
      const novoArray = [...prev[alunoId]];
      novoArray[slotIndex] = novoStatus;
      return { ...prev, [alunoId]: novoArray };
    });
  }

  async function salvar() {
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const ownerUid = turma.ownerUid || uid;
      await salvarPresenca(ownerUid, turma.id, data, status, uid);
      setMensagem("Presença salva com sucesso.");
    } catch {
      setErro("Erro ao salvar presença.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading)
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px", color: "var(--texto)" }}>
          {professor?.role === "coordenador" ? "Visualizar presença" : "Registrar presença"}
        </h3>
        <SkeletonList linhas={4} alturaCard={72} />
      </div>
    );

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: "var(--texto)" }}>
            {isCoordenador ? "Visualizar presença" : "Registrar presença"}
          </h3>
          {aulasNoDia > 1 && !semAulaHoje && (
            <span style={{ display: "inline-block", marginTop: 6, fontSize: 11, background: "var(--roxo-claro)", color: "var(--roxo)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
              Detectado: {aulasNoDia} tempos de aula neste dia
            </span>
          )}
        </div>
  <div style={{ minWidth: 160 }}>
    <CustomDatePicker
      id="data-presenca"
      label={null}
      value={data}
      onChange={setData}
      dropdownAberto={dropdownAberto}
      setDropdownAberto={setDropdownAberto}
    /> 
    </div>
      </div>

      {erro && <p style={{ color: "#c0392b", fontSize: 12 }}>{erro}</p>}
      {mensagem && <p style={{ color: "#047857", fontSize: 12 }}>{mensagem}</p>}

      

    {semAulaHoje ? (
      <p className="secao-vazia">
        Não há aula desta matéria para esta turma no dia selecionado.
      </p>
    ) : alunos.length === 0 ? (
      <p className="secao-vazia">Nenhum aluno cadastrado nesta sala ainda.</p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alunos.map((a) => (
            <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--borda)" }}>
              
              <span style={{ fontSize: 14, color: "var(--texto)", fontWeight: 600 }}>
                {a.numero ? <span style={{ color: "var(--texto-sec)" }}>{a.numero} · </span> : ""}{a.nome}
              </span>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: aulasNoDia }).map((_, slotIndex) => (
                  <div key={slotIndex} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    
                    {aulasNoDia > 1 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--texto-sec)", minWidth: 60, textTransform: "uppercase" }}>
                        {slotIndex + 1}ª Aula
                      </div>
                    )}
                    
                    <div style={{ display: "flex", gap: 6 }}>
                      {Object.entries(STATUS).map(([key, s]) => {
                        const ativo = status[a.id][slotIndex] === key;
                        const Icon = s.icon;
                        return (
                          <button
                            key={key}
                            disabled={isCoordenador}
                            onClick={() => handleStatusChange(a.id, slotIndex, key)}
                            title={s.label}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "6px 12px", borderRadius: 20, border: "none", 
                              cursor: isCoordenador ? "default" : "pointer",
                              background: ativo ? s.cor : "#e8e8e8",
                              color: ativo ? "#fff" : "#888",
                              fontSize: 11, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                              transition: "all .15s",
                              opacity: isCoordenador && !ativo ? 0.4 : 1
                            }}
                          >
                            <Icon size={12} strokeWidth={3} /> <span className="esconder-mobile">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!isCoordenador && (
            <button className="perfil-salvar" style={{ marginTop: 12, maxWidth: 220 }} onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar presença"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}