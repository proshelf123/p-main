import { useEffect, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  escutarTurmasPeriodo, 
  buscarAlunos, 
  buscarConfiguracoesEscola, 
  buscarTurmasDaSala, 
  buscarNotasDaTurma 
} from "../firebase/estrutura";
import DropdownComPortal from "../secoes/DropwdownComPortal";

// Helper para descobrir os períodos (mesmo usado nas configurações)
const obterPeriodos = (sistema) => {
  switch (sistema) {
    case "trimestral": return [{ key: "periodo_1", label: "1º Tri" }, { key: "periodo_2", label: "2º Tri" }, { key: "periodo_3", label: "3º Tri" }];
    case "semestral": return [{ key: "periodo_1", label: "1º Sem" }, { key: "periodo_2", label: "2º Sem" }];
    case "livre": return [{ key: "periodo_1", label: "Nota Final" }];
    case "bimestral":
    default: return [{ key: "periodo_1", label: "1º Bim" }, { key: "periodo_2", label: "2º Bim" }, { key: "periodo_3", label: "3º Bim" }, { key: "periodo_4", label: "4º Bim" }];
  }
};

export default function Boletins({ uid }) {
  const [salas, setSalas] = useState([]);
  const [salaSel, setSalaSel] = useState("");
  
  const [alunos, setAlunos] = useState([]);
  const [disciplinasUnicas, setDisciplinasUnicas] = useState([]); // Agora guarda apenas nomes de matérias
  const [notasGerais, setNotasGerais] = useState({}); // { alunoId: { nomeDisciplina: { periodo_1: 8 } } }
  const [config, setConfig] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [alunoExpandido, setAlunoExpandido] = useState(null); // Accordion do aluno
  const [dropdownAberto, setDropdownAberto] = useState(null);

  // 1. Carrega as salas disponíveis
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

  // 2. Quando a sala mudar, carrega o cruzamento de dados
  useEffect(() => {
    if (salaSel) carregarBoletins();
  }, [salaSel]);

  async function carregarBoletins() {
    setCarregandoDados(true);
    try {
      // Busca Alunos, Configurações e as Disciplinas daquela sala em paralelo
      const [listaAlunos, conf, listaTurmas] = await Promise.all([
        buscarAlunos(uid, salaSel),
        buscarConfiguracoesEscola(uid),
        buscarTurmasDaSala(uid, salaSel)
      ]);

      setConfig(conf);
      setAlunos(listaAlunos);
      
      // 3. Extrai apenas os nomes ÚNICOS das disciplinas e ordena alfabeticamente
      const nomesDisciplinas = Array.from(
        new Set(listaTurmas.map(t => t.disciplina))
      ).filter(Boolean).sort((a, b) => a.localeCompare(b));
      
      setDisciplinasUnicas(nomesDisciplinas);

      // 4. Agrupa as notas pela DISCIPLINA (juntando duplicatas se houver)
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
          
          // Mescla as notas (sobrepõe garantindo que não perca dados de turmas duplicadas)
          Object.keys(notasNovas).forEach(periodo => {
            if (notasNovas[periodo] !== undefined && notasNovas[periodo] !== "") {
                notasAtuais[periodo] = notasNovas[periodo];
            }
          });
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

  // Helper para calcular a média de uma disciplina
  function calcularMedia(notasObj, periodos) {
    if (!notasObj) return "-";
    let soma = 0;
    let qtd = 0;
    periodos.forEach(p => {
      const nota = parseFloat(notasObj[p.key]);
      if (!isNaN(nota)) {
        soma += nota;
        qtd++;
      }
    });
    return qtd > 0 ? (soma / qtd).toFixed(1) : "-";
  }

  function imprimirBoletim() {
    window.print();
  }

  if (loading) return <p className="secao-vazia">Carregando...</p>;

  const periodos = obterPeriodos(config?.sistemaAvaliacao || "bimestral");
  const mediaCorte = config?.mediaAprovacao || 6.0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      
      {/* CSS PARA IMPRESSÃO (Oculta botões e menus, mostra só o boletim) */}
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
            {alunos.map((aluno, index) => {
              const expandido = alunoExpandido === aluno.id;

              return (
                <AnimatePresence key={aluno.id} mode="wait">
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    style={{ border: "1px solid var(--borda)", borderRadius: 12, overflow: "hidden", background: expandido ? "var(--branco)" : "white" }}
                  >
                
                {/* CABEÇALHO DO ACCORDION (Nome do Aluno) */}
                <motion.button 
                  className="nao-imprimir"
                  onClick={() => setAlunoExpandido(expandido ? null : aluno.id)}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--texto)" }}>
                    {aluno.numero ? `${aluno.numero} · ` : ""}{aluno.nome}
                  </span>
                  <motion.span 
                    animate={{ rotate: expandido ? 90 : 0 }} 
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ fontSize: 18, color: "var(--texto-sec)" }}
                  >
                    ›
                  </motion.span>
                </motion.button>

                {/* CORPO DO BOLETIM (Tabela de Notas) */}
                {expandido && (
                  <div className="area-boletim" style={{ padding: "0 20px 20px" }}>
                    
                    <div className="nao-imprimir" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <button onClick={imprimirBoletim} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#F1EDF4", color: "var(--roxo)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                        <Printer size={16} /> Imprimir Boletim
                      </button>
                    </div>

                    {/* CABEÇALHO DO PDF (Aparece na impressão) */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#111" }}>Boletim Escolar - {config?.anoLetivo}</h3>
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
                        {disciplinasUnicas.map((disciplina, dIndex) => {
                          const notasDoAluno = notasGerais[aluno.id]?.[disciplina] || {};
                          const media = calcularMedia(notasDoAluno, periodos);
                          const mediaNum = parseFloat(media);
                          const corMedia = !isNaN(mediaNum) ? (mediaNum >= mediaCorte ? "#047857" : "#ED235C") : "var(--texto)";

                          return (
                            <motion.tr
                              key={disciplina}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: dIndex * 0.05, ease: [0.4, 0, 0.2, 1] }}
                              style={{ borderBottom: "1px solid var(--borda)" }}
                            >
                              <td style={{ padding: "10px 12px", fontWeight: 500, color: "var(--texto)" }}>{disciplina}</td>
                              
                              {periodos.map(p => {
                                const nota = notasDoAluno[p.key] !== undefined ? parseFloat(notasDoAluno[p.key]).toFixed(1) : "-";
                                const corNota = nota !== "-" ? (parseFloat(nota) >= mediaCorte ? "#047857" : "#ED235C") : "var(--texto-sec)";
                                return (
                                  <td key={p.key} style={{ padding: "10px 12px", textAlign: "center", color: corNota, fontWeight: 500 }}>
                                    {nota}
                                  </td>
                                );
                              })}
                              
                              <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: corMedia, background: "#fafafa" }}>
                                {media}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p style={{ fontSize: 11, color: "var(--texto-sec)", marginTop: 12, textAlign: "right" }}>
                      * Média para aprovação: {mediaCorte.toFixed(1)}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          );
        })}
      </motion.div>
    </AnimatePresence>
      )}
    </div>
  );
}