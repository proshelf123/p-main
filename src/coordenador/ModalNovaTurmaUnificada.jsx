import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { 
  buscarProfessores, 
  escutarProfessoresDisciplinas, 
  adicionarTurmaPeriodo, 
  criarTurma 
} from "../firebase/estrutura";
import { criarNotificacao, criarNotificacaoPorRole } from "../notificacoes/notificacoes";
import DropdownComPortal from "../secoes/DropwdownComPortal";
import useCoresDisciplinas from "../hooks/useCoresDisciplinas";
import { listarDisciplinasComCor, listarVinculosDisciplina } from "../secoes/vinculosDisciplinas";
import { normalizarDisciplina } from "../secoes/coresDisciplinas";

const ANOS = ["1°", "2°", "3°"];
const PERIODOS = ["Matutino", "Vespertino", "Noturno"];

const FORM_INICIAL = {
  ano: "1°",
  curso: "",
  modular: false,
  periodo: "Matutino",
  disciplina: "",
  professor: "",
  professorId: ""
};

export default function ModalNovaTurmaUnificada({ uid, professorLogado, onClose }) {
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(null);

  const [professores, setProfessores] = useState([]);
  const [professoresDisciplinas, setProfessoresDisciplinas] = useState({});
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  
  const coresDisciplinas = useCoresDisciplinas();

  useEffect(() => {
buscarProfessores(uid).then(setProfessores);
  const unsub = escutarProfessoresDisciplinas(uid, setProfessoresDisciplinas, (err) => console.error(err));
    return () => unsub();
  }, []);

  const disciplinasCadastradas = useMemo(() => listarDisciplinasComCor(coresDisciplinas), [coresDisciplinas]);

  const opcoesDisciplinasTurma = useMemo(() => {
    const opcoes = [...disciplinasCadastradas];
    
    if (form.disciplina && !opcoes.some(o => normalizarDisciplina(o) === normalizarDisciplina(form.disciplina))) {
      opcoes.push(form.disciplina);
    }
    
    return [
      "Selecione a disciplina",
      ...opcoes.sort((a, b) => a.localeCompare(b, "pt-BR")),
    ];
  }, [disciplinasCadastradas, form.disciplina]);

  function selecionarDisciplina(disciplina) {
    if (!disciplina) {
      setForm(atual => ({ ...atual, disciplina: "", professor: "", professorId: "" }));
      setErro("");
      return;
    }

    const professoresDaDisciplina = listarVinculosDisciplina(disciplina, professoresDisciplinas)
      .map(v => ({ professor: v.nome, professorId: v.professorId || "" }))
      .filter(item => item.professor)
      .sort((a, b) => a.professor.localeCompare(b.professor, "pt-BR"));

    const profSelecionado = professoresDaDisciplina[0] || { professor: "", professorId: "" };
    setForm(atual => ({ ...atual, disciplina, professor: profSelecionado.professor, professorId: profSelecionado.professorId }));
    setErro("");
  }

  const professoresFiltrados = form.professor.trim() === "" 
    ? professores 
    : professores.filter(p => String(p.nome || "").toLowerCase().includes(form.professor.toLowerCase()));

  async function handleSalvar() {
    if (!form.curso.trim()) { setErro("Informe o nome do curso."); return; }
    if (!form.disciplina.trim()) { setErro("Informe a disciplina base da turma."); return; }

    setSalvando(true);
    setErro("");

    const nomeTurmaFinal = `${form.ano} ${form.curso.trim()}${form.modular ? ' - Modular' : ''}`;
    const nomePeriodoFormatado = `Período ${form.periodo}`;

    try {
      await adicionarTurmaPeriodo(nomeTurmaFinal, nomePeriodoFormatado, uid);

      await criarTurma(uid, {
        nome: nomeTurmaFinal,
        disciplina: form.disciplina,
        periodo: form.periodo,
        professor: form.professor,
        professorId: form.professorId
      });

      await criarNotificacaoPorRole({
        role: "professor",
        titulo: "Nova turma criada",
        mensagem: `A turma ${nomeTurmaFinal} (${form.periodo}) foi adicionada com a disciplina ${form.disciplina}.`,
        tipo: "turma",
        link: "/arquivos",
        criadoPorUid: uid,
        criadoPorNome: professorLogado?.nome || "Coordenação"
      });

      if (form.professorId) {
        await criarNotificacao({
          titulo: "Nova Turma Vinculada",
          mensagem: `Você foi associado à turma "${nomeTurmaFinal}" no período ${form.periodo}.`,
          tipo: "turma",
          link: "/turmas",
          destinatarioUids: [form.professorId],
          criadoPorNome: "Coordenação",
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setErro("Ocorreu um erro ao criar a turma. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        zIndex: 99999,
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* CARD BRANCO PRINCIPAL */}
      <motion.div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 500,
          width: "100%",
          maxHeight: "85vh", 
          display: "flex", 
          flexDirection: "column",
          overflow: "hidden", // ISSO CORTA QUALQUER VAZAMENTO
          padding: 0, // Removemos o padding externo para o scrollbar ficar no canto certo
          borderRadius: "12px",
          backgroundColor: "var(--branco, #ffffff)"
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        
        {/* CONTAINER INTERNO COM SCROLL */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", boxSizing: "border-box" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h3 className="modal-titulo" style={{ margin: 0, fontSize: 18 }}>Criação Unificada de Turma</h3>
              <p style={{ fontSize: 12, color: "var(--texto-sec)", margin: "4px 0 0" }}>
                Cria a pasta nos Arquivos e o vínculo de disciplina nas Turmas.
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--texto-sec)" }}>
              <X size={20} />
            </button>
          </div>

          {/* --- PASSO 1: DADOS BASE (ARQUIVOS) --- */}
          <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
            <h4 style={{ fontSize: 11, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>1. Dados Gerais</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DropdownComPortal
                label="Ano"
                opcoes={ANOS.map(a => `${a} Ano`)}
                valor={`${form.ano} Ano`}
                onChange={opt => setForm({ ...form, ano: opt.replace(" Ano", "") })}
                id="uni-ano" dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
              />
              <DropdownComPortal
                label="Período"
                opcoes={PERIODOS}
                valor={form.periodo}
                onChange={opt => setForm({ ...form, periodo: opt })}
                id="uni-periodo" dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
              />
            </div>
            
            <div className="perfil-grupo" style={{ marginTop: 12, marginBottom: 0 }}>
              <label className="perfil-label">Nome do Curso</label>
              <input className="perfil-input" value={form.curso} onChange={e => setForm({ ...form, curso: e.target.value })} placeholder="Ex: Informática para Internet" />
            </div>

            <div className="perfil-grupo" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 12, marginBottom: 0 }} onClick={() => setForm({ ...form, modular: !form.modular })}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.modular ? "var(--roxo)" : "#D1D5DB"}`, background: form.modular ? "var(--roxo)" : "var(--branco)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.modular && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "var(--texto)", fontWeight: 500 }}>Turma Modular</span>
            </div>
          </div>

          {/* --- PASSO 2: DISCIPLINA (TURMAS) --- */}
          <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8 }}>
            <h4 style={{ fontSize: 11, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>2. Vínculo de Disciplina Inicial</h4>
            
            <DropdownComPortal
              label="Disciplina"
              opcoes={opcoesDisciplinasTurma}
              valor={form.disciplina || "Selecione a disciplina"}
              onChange={opt => selecionarDisciplina(opt === "Selecione a disciplina" ? "" : opt)}
              id="uni-disciplina" dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
            />

            <div className="perfil-grupo" style={{ marginTop: 12, marginBottom: 0, position: "relative" }}>
              <label className="perfil-label">Professor</label>
              <input
                className="perfil-input"
                value={form.professor}
                onChange={e => { setForm({ ...form, professor: e.target.value, professorId: "" }); setMostrarSugestoes(true); }}
                onFocus={() => setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                placeholder="Digite o nome do professor..."
              />
              
              <AnimatePresence>
                {mostrarSugestoes && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="dropdown-menu" 
                    style={{ 
                      position: "absolute", top: "100%", left: 0, right: 0, 
                      maxHeight: "160px", overflowY: "auto", zIndex: 1300,
                      background: "var(--branco, #fff)", border: "1px solid var(--borda, #D1D5DB)", 
                      borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                  >
                    {professoresFiltrados.length > 0 ? (
                      professoresFiltrados.map(p => (
                        <button 
                          key={p.id} type="button" className="dropdown-item" 
                          onMouseDown={() => { setForm({ ...form, professor: p.nome, professorId: p.id }); setMostrarSugestoes(false); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "var(--texto)" }}
                        >
                          {p.nome}
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--texto-sec)" }}>Nenhum encontrado</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {form.curso.trim() && form.disciplina && (
            <div style={{ background: "var(--roxo-claro)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--roxo)", fontWeight: 600, marginTop: 16 }}>
              Ação: Criando Arquivos e Turma ({form.disciplina}) para "{form.ano} {form.curso.trim()}{form.modular ? ' - Modular' : ''}"
            </div>
          )}

          {erro && <p style={{ color: "#c0392b", fontSize: 12, margin: "12px 0 0" }}>{erro}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button className="perfil-salvar" onClick={handleSalvar} disabled={salvando} style={{ flex: 1 }}>
              {salvando ? "Criando..." : "Criar Turma Unificada"}
            </button>
            <button className="btn-cancelar" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}