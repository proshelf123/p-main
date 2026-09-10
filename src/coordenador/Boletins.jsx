import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  escutarTurmasPeriodo, 
  buscarAlunos, 
  buscarConfiguracoesEscola, 
  buscarTurmasDaSala, 
  buscarNotasDaTurma 
} from "../firebase/estrutura";
import DropdownComPortal from "../secoes/DropwdownComPortal";

// Helper de períodos[cite: 7]
const obterPeriodos = (sistema) => {
  switch (sistema) {
    case "trimestral": return [{ key: "1", label: "1º Tri" }, { key: "2", label: "2º Tri" }, { key: "3", label: "3º Tri" }];
    case "semestral": return [{ key: "1", label: "1º Sem" }, { key: "2", label: "2º Sem" }];
    case "livre": return [{ key: "1", label: "Nota Final" }];
    case "bimestral":
    default: return [{ key: "1", label: "1º Bim" }, { key: "2", label: "2º Bim" }, { key: "3", label: "3º Bim" }, { key: "4", label: "4º Bim" }];
  }
};

const PESO_CONCEITO = {
  'MB': 10,
  'B': 8,
  'R': 6,
  'I': 4
};

export default function Boletins({ uid }) {
  const [salas, setSalas] = useState([]);
  const [salaSel, setSalaSel] = useState("");
  
  const [alunos, setAlunos] = useState([]);
  const [disciplinasUnicas, setDisciplinasUnicas] = useState([]);
  const [notasGerais, setNotasGerais] = useState({});
  const [config, setConfig] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [alunoExpandido, setAlunoExpandido] = useState(null);
  const [dropdownAberto, setDropdownAberto] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = escutarTurmasPeriodo(uid, (mapa) => {
      const todasAsSalas = new Set();
      Object.values(mapa).forEach(lista => lista.forEach(item => todasAsSalas.add(item.nomeTurma)));
      const arraySalas = Array.from(todasAsSalas).sort();
      setSalas(arraySalas);
      if (arraySalas.length > 0 && !salaSel) setSalaSel(arraySalas[0]);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (salaSel) carregarBoletins();
  }, [salaSel]);

  // Função auxiliar flexível que busca a nota independente do nome da chave no Firestore
  function extrairNotaFlexivel(notasObj, indexPeriodo) {
    if (!notasObj) return "-";
    const pNum = indexPeriodo + 1;

    const chavesPossiveis = [
      `periodo_${pNum}`,
      `${pNum}`,
      `${pNum}º Bim`,
      `${pNum}º Bim.`,
      `${pNum}º Tri`,
      `${pNum}º Sem`,
      `bim${pNum}`,
      `b${pNum}`
    ];

    for (const chave of chavesPossiveis) {
      if (notasObj[chave] !== undefined && notasObj[chave] !== null && notasObj[chave] !== "") {
        return notasObj[chave];
      }
    }
    return "-";
  }

  async function carregarBoletins() {
    setCarregandoDados(true);
    try {
      const [listaAlunos, conf, listaTurmas] = await Promise.all([
        buscarAlunos(uid, salaSel),
        buscarConfiguracoesEscola(uid),
        buscarTurmasDaSala(uid, salaSel)
      ]);

      setConfig(conf);
      setAlunos(listaAlunos);
      
      const nomesDisciplinas = Array.from(
        new Set(listaTurmas.map(t => t.disciplina))
      ).filter(Boolean).sort((a, b) => a.localeCompare(b));
      
      setDisciplinasUnicas(nomesDisciplinas);

      const notasAgrupadas = {}; 
      
      const promessasDeNotas = listaTurmas.map(async (turma) => {
        const notasDaTurma = await buscarNotasDaTurma(turma.ownerUid || uid, turma.id);
        
        listaAlunos.forEach(aluno => {
          if (!notasAgrupadas[aluno.id]) notasAgrupadas[aluno.id] = {};
          if (!notasAgrupadas[aluno.id][turma.disciplina]) {
             notasAgrupadas[aluno.id][turma.disciplina] = {};
          }
          
          const notasAtuais = notasAgrupadas[aluno.id][turma.disciplina];
          const notasNovas = notasDaTurma[aluno.id]?.notas || {};
          
          Object.assign(notasAtuais, notasNovas);
        });
      });

      await Promise.all(promessasDeNotas);
      setNotasGerais(notasAgrupadas);

    } catch (error) {
      console.error("Erro ao montar boletins:", error);
    } finally {
      setCarregandoDados(false);
    }
  }

  // Calcula a Média lidando com Conceitos e Números
  function calcularMedia(notasObj, periodos) {
    if (!notasObj) return "-";
    let soma = 0;
    let qtd = 0;
    let temConceito = false;

    periodos.forEach((p, idx) => {
      const val = extrairNotaFlexivel(notasObj, idx);
      if (val !== "-") {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          soma += num;
          qtd++;
        } else if (typeof val === "string" && PESO_CONCEITO[val.toUpperCase()]) {
          temConceito = true;
          soma += PESO_CONCEITO[val.toUpperCase()];
          qtd++;
        }
      }
    });

    if (qtd === 0) return "-";

    if (temConceito) {
      const mediaVal = soma / qtd;
      if (mediaVal >= 9) return "MB";
      if (mediaVal >= 7) return "B";
      if (mediaVal >= 5) return "R";
      return "I";
    }

    return (soma / qtd).toFixed(1);
  }

  function imprimirBoletim() {
    window.print();
  }

  if (loading) return <p className="secao-vazia">Carregando...</p>;

  const periodos = obterPeriodos(config?.sistemaAvaliacao || "bimestral");
  const mediaCorte = config?.mediaAprovacao || 6.0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .area-boletim, .area-boletim * { visibility: visible; }
          .area-boletim { position: absolute; left: 0; top: 0; width: 100%; }
          .nao-imprimir { display: none !important; }
        }
      `}</style>

      <div className="nao-imprimir" style={{ paddingLeft: "15px", borderLeft: "3px solid var(--roxo)", marginBottom: 24 }}>
        <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-block' }}>Coordenador</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--texto)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Boletins por Turmas
        </h2>
        <p style={{ fontSize: 14, color: "var(--texto-sec)", margin: "4px 0 0" }}>
          Verifique os boletins oficiais dos alunos.
        </p>
      </div>

      <div className="nao-imprimir" style={{ maxWidth: 320, marginBottom: 24 }}>
        <DropdownComPortal
          id="sala-boletim"
          label="Selecione a Sala"
          opcoes={salas.map((s) => ({ valor: s, label: s }))}
          valor={salaSel}
          onChange={(novaSala) => { setSalaSel(novaSala); setAlunoExpandido(null); }}
          dropdownAberto={dropdownAberto}
          setDropdownAberto={setDropdownAberto}
        />
      </div>

      {carregandoDados ? (
        <p className="secao-vazia">Calculando médias e cruzando dados...</p>
      ) : alunos.length === 0 ? (
        <p className="secao-vazia">Nenhum aluno encontrado nesta sala.</p>
      ) : disciplinasUnicas.length === 0 ? (
        <p className="secao-vazia">Nenhuma disciplina vinculada a esta sala ainda.</p>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {alunos.map((aluno) => {
              const expandido = alunoExpandido === aluno.id;

              return (
                <div key={aluno.id} style={{ border: "1px solid var(--borda)", borderRadius: 12, overflow: "hidden", background: "white" }}>
                  <button 
                    className="nao-imprimir"
                    onClick={() => setAlunoExpandido(expandido ? null : aluno.id)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--texto)" }}>
                      {aluno.numero ? `${aluno.numero} · ` : ""}{aluno.nome}
                    </span>
                    <span style={{ fontSize: 18, color: "var(--texto-sec)", transform: expandido ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      ›
                    </span>
                  </button>

                  {expandido && (
                    <div className="area-boletim" style={{ padding: "0 20px 20px" }}>
                      <div className="nao-imprimir" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                        <button onClick={imprimirBoletim} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#F1EDF4", color: "var(--roxo)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          <Printer size={16} /> Imprimir Boletim
                        </button>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#111" }}>Boletim Escolar - {config?.anoLetivo || 2026}</h3>
                        <p style={{ margin: 0, fontSize: 14, color: "#444" }}><b>Aluno(a):</b> {aluno.nome} | <b>Turma:</b> {salaSel}</p>
                      </div>

                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, border: "1px solid var(--borda)" }}>
                        <thead>
                          <tr style={{ background: "#F8F9FB", borderBottom: "2px solid var(--borda)" }}>
                            <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--texto-sec)" }}>Disciplina</th>
                            {periodos.map(p => (
                              <th key={p.key} style={{ padding: "10px 12px", textAlign: "center", color: "var(--texto-sec)" }}>{p.label}</th>
                            ))}
                            <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--texto)", background: "#EEEDFE" }}>Média Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disciplinasUnicas.map((disciplina) => {
                            const notasDoAluno = notasGerais[aluno.id]?.[disciplina] || {};
                            const media = calcularMedia(notasDoAluno, periodos);

                            return (
                              <tr key={disciplina} style={{ borderBottom: "1px solid var(--borda)" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 500, color: "var(--texto)" }}>{disciplina}</td>
                                
                                {periodos.map((p, idx) => {
                                  const valNota = extrairNotaFlexivel(notasDoAluno, idx);
                                  return (
                                    <td key={p.key} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "var(--texto)" }}>
                                      {valNota}
                                    </td>
                                  );
                                })}
                                
                                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, background: "#fafafa" }}>
                                  {media}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}