import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
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

  // Carrega os professores e vínculos (Igual ao Turmas.jsx)
  useEffect(() => {
    buscarProfessores().then(setProfessores);
    const unsub = escutarProfessoresDisciplinas(setProfessoresDisciplinas, (err) => console.error(err));
    return () => unsub();
  }, []);

  const disciplinasCadastradas = useMemo(() => listarDisciplinasComCor(coresDisciplinas), [coresDisciplinas]);

  const opcoesDisciplinasTurma = useMemo(() => {
    const opcoes = disciplinasCadastradas.map(d => ({ valor: d, label: d }));
    if (form.disciplina && !opcoes.some(o => normalizarDisciplina(o.valor) === normalizarDisciplina(form.disciplina))) {
      opcoes.push({ valor: form.disciplina, label: form.disciplina });
    }
    return [
      { valor: "", label: "Selecione a disciplina" },
      ...opcoes.sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    ];
  }, [disciplinasCadastradas, form.disciplina]);

  const professoresOrdenados = useMemo(() => professores
    .map(p => ({ valor: p.id || p.email || p.nome, label: p.nomePDF || p.nome || p.email, professor: p.nomePDF || p.nome, professorId: p.id || "" }))
    .filter(item => item.valor && item.professor)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), [professores]);

  const opcoesProfessoresTurma = useMemo(() => {
    const vinculados = listarVinculosDisciplina(form.disciplina, professoresDisciplinas)
      .map(v => ({ valor: v.professorId || v.nome, label: v.nome, professor: v.nome, professorId: v.professorId || "" }))
      .filter(item => item.valor && item.professor)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    const base = vinculados.length > 0 ? vinculados : professoresOrdenados;
    return [{ valor: "", label: "Sem professor", professor: "", professorId: "" }, ...base];
  }, [form.disciplina, professoresDisciplinas, professoresOrdenados]);

  function selecionarDisciplina(disciplina) {
    const professoresDaDisciplina = listarVinculosDisciplina(disciplina, professoresDisciplinas)
      .map(v => ({ professor: v.nome, professorId: v.professorId || "" }))
      .filter(item => item.professor)
      .sort((a, b) => a.professor.localeCompare(b.professor, "pt-BR"));

    const profSelecionado = professoresDaDisciplina[0] || { professor: "", professorId: "" };
    setForm(atual => ({ ...atual, disciplina, professor: profSelecionado.professor, professorId: profSelecionado.professorId }));
    setErro("");
  }

  const professoresFiltrados = form.professor.trim() === "" ? professores : professores.filter(p => String(p.nome || "").toLowerCase().includes(form.professor.toLowerCase()));

  async function handleSalvar() {
    if (!form.curso.trim()) { setErro("Informe o nome do curso."); return; }
    if (!form.disciplina.trim()) { setErro("Informe a disciplina base da turma."); return; }

    setSalvando(true);
    setErro("");

    // Monta o nome final (Ex: 1° Informática - Modular)
    const nomeTurmaFinal = `${form.ano} ${form.curso.trim()}${form.modular ? ' - Modular' : ''}`;
    const nomePeriodoFormatado = `Período ${form.periodo}`;

    try {
      // 1. Cria a base em "Arquivos" (estrutura de Período -> Turma)
      await adicionarTurmaPeriodo(nomeTurmaFinal, nomePeriodoFormatado, uid);

      // 2. Cria a turma específica em "Turmas" (Vinculando à Disciplina)
      await criarTurma(uid, {
        nome: nomeTurmaFinal,
        disciplina: form.disciplina,
        periodo: form.periodo,
        professor: form.professor,
        professorId: form.professorId
      });

      // 3. Dispara Notificações
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
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 className="modal-titulo" style={{ margin: 0, fontSize: 18 }}>Criação Unificada de Turma</h3>
            <p style={{ fontSize: 12, color: "var(--texto-sec)", margin: "4px 0 0" }}>
              Cria a pasta nos Arquivos e o vínculo de disciplina nas Turmas simultaneamente.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--texto-sec)" }}>
            <X size={20} />
          </button>
        </div>

        {/* --- PASSO 1: DADOS BASE (ARQUIVOS) --- */}
        <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>1. Dados Gerais</h4>
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
          
          <div className="perfil-grupo" style={{ marginTop: 12 }}>
            <label className="perfil-label">Nome do Curso</label>
            <input className="perfil-input" value={form.curso} onChange={e => setForm({ ...form, curso: e.target.value })} placeholder="Ex: Informática para Internet" />
          </div>

          <div className="perfil-grupo" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 12 }} onClick={() => setForm({ ...form, modular: !form.modular })}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.modular ? "var(--roxo)" : "#D1D5DB"}`, background: form.modular ? "var(--roxo)" : "var(--branco)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {form.modular && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: "var(--texto)", fontWeight: 500 }}>Turma Modular</span>
          </div>
        </div>

        {/* --- PASSO 2: DISCIPLINA (TURMAS) --- */}
        <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8 }}>
          <h4 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>2. Vínculo de Disciplina Inicial</h4>
          
          <DropdownComPortal
            label="Disciplina"
            opcoes={opcoesDisciplinasTurma}
            valor={form.disciplina}
            onChange={selecionarDisciplina}
            id="uni-disciplina" dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
          />

          <div className="perfil-grupo" style={{ marginTop: 12, position: "relative" }}>
            <label className="perfil-label">Professor</label>
            <input
              className="perfil-input"
              value={form.professor}
              onChange={e => { setForm({ ...form, professor: e.target.value, professorId: "" }); setMostrarSugestoes(true); }}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
              placeholder="Digite o nome do professor..."
            />
            {mostrarSugestoes && (
              <div className="dropdown-menu" style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "160px", overflowY: "auto", zIndex: 1300 }}>
                {professoresFiltrados.length > 0 ? (
                  professoresFiltrados.map(p => (
                    <button key={p.id} type="button" className="dropdown-item" onMouseDown={() => { setForm({ ...form, professor: p.nome, professorId: p.id }); setMostrarSugestoes(false); }}>
                      {p.nome}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--texto-sec)" }}>Nenhum encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>

        {form.curso.trim() && form.disciplina && (
          <div style={{ background: "var(--roxo-claro)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--roxo)", fontWeight: 600, marginTop: 12 }}>
            Ação: Criando Arquivos e Turma ({form.disciplina}) para "{form.ano} {form.curso.trim()}{form.modular ? ' - Modular' : ''}"
          </div>
        )}

        {erro && <p style={{ color: "#c0392b", fontSize: 12, margin: "8px 0 0" }}>{erro}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="perfil-salvar" onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Criando Turma..." : "Criar Turma Unificada"}
          </button>
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}