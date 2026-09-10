import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { 
  buscarProfessores, 
  escutarProfessoresDisciplinas, 
  buscarOuCriarTurmaPeriodo, 
  criarTurma,
  atualizarTurma,
  buscarTurmas
} from "../firebase/estrutura";
import { criarNotificacao, criarNotificacaoPorRole } from "../notificacoes/notificacoes";
import DropdownComPortal from "../secoes/DropwdownComPortal";
import useCoresDisciplinas from "../hooks/useCoresDisciplinas";
import { listarDisciplinasComCor, listarVinculosDisciplina } from "../secoes/vinculosDisciplinas";
import { normalizarDisciplina } from "../secoes/coresDisciplinas";

const ANOS = ["1°", "2°", "3°"];
const PERIODOS = ["Matutino", "Vespertino", "Noturno"];
const SALA_SENTINELA = "Selecione a sala";

const FORM_INICIAL = {
  ano: "1°",
  curso: "",
  modular: false,
  periodo: "Matutino",
  disciplina: "",
  professor: "",
  professorId: ""
};

// Reconstrói o form a partir de uma turma existente (nome = "1° Curso - Modular")
function mapearTurmaParaForm(turma) {
  const nomeCompleto = turma.nome || "";
  const modular = nomeCompleto.endsWith(" - Modular");
  const semSufixo = modular ? nomeCompleto.slice(0, -" - Modular".length) : nomeCompleto;
  const [anoDetectado, ...restoPartes] = semSufixo.split(" ");
  const curso = restoPartes.join(" ");

  return {
    ano: ANOS.includes(anoDetectado) ? anoDetectado : "1°",
    curso,
    modular,
    periodo: turma.periodo || "Matutino",
    disciplina: turma.disciplina || "",
    professor: turma.professor || "",
    professorId: turma.professorId || ""
  };
}

// Agrupa a lista flat de turmas em salas únicas (mesma nome + periodo = mesma pasta em Arquivos)
function agruparSalasExistentes(turmas) {
  const mapa = new Map();

  turmas.forEach((t) => {
    if (!t.nome || !t.periodo) return;
    const chave = `${t.nome}|||${t.periodo}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, { nome: t.nome, periodo: t.periodo, disciplinas: [] });
    }
    if (t.disciplina) mapa.get(chave).disciplinas.push(t.disciplina);
  });

  return [...mapa.values()].sort((a, b) => (
    a.nome.localeCompare(b.nome, "pt-BR") || a.periodo.localeCompare(b.periodo, "pt-BR")
  ));
}

function labelSala(sala) {
  return `${sala.nome} · ${sala.periodo}`;
}

export default function ModalNovaTurmaUnificada({ uid, professorLogado, turmaParaEditar = null, onClose }) {
  const modoEdicao = Boolean(turmaParaEditar);

  const [form, setForm] = useState(() => modoEdicao ? mapearTurmaParaForm(turmaParaEditar) : FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(null);

  const [professores, setProfessores] = useState([]);
  const [professoresDisciplinas, setProfessoresDisciplinas] = useState({});
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // --- Novo: alternância entre criar sala nova ou usar uma sala já existente ---
  const [modoCriacao, setModoCriacao] = useState("novo"); // "novo" | "existente"
  const [turmasExistentes, setTurmasExistentes] = useState([]);
  const [carregandoSalas, setCarregandoSalas] = useState(false);
  const [salaSelecionada, setSalaSelecionada] = useState(null); // { nome, periodo, disciplinas }

  const coresDisciplinas = useCoresDisciplinas();

useEffect(() => {
    // 🛡️ Trava de segurança: impede chamadas se o UID não foi fornecido
    if (!uid) return;

    buscarProfessores(uid)
      .then((profs) => setProfessores(profs || []))
      .catch((err) => console.error("Erro ao buscar professores:", err));

    const unsub = escutarProfessoresDisciplinas(
      uid, 
      (vinc) => setProfessoresDisciplinas(vinc || {}), 
      (err) => console.error("Erro ao escutar vínculos:", err)
    );

    return () => unsub();
  }, [uid]);

useEffect(() => {
    if (modoEdicao || !uid) return; // 🛡️ Trava se não houver UID

    setCarregandoSalas(true);
    buscarTurmas(uid, professorLogado)
      .then((dados) => setTurmasExistentes(dados || []))
      .catch((err) => {
        console.error("Erro ao carregar salas existentes:", err);
        setTurmasExistentes([]);
      })
      .finally(() => setCarregandoSalas(false));
  }, [uid, professorLogado, modoEdicao]);

  const salasExistentes = useMemo(() => agruparSalasExistentes(turmasExistentes), [turmasExistentes]);

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

  const opcoesSalasExistentes = useMemo(() => {
    if (carregandoSalas) return ["Carregando salas..."];
    if (salasExistentes.length === 0) return ["Nenhuma sala cadastrada"];
    return [SALA_SENTINELA, ...salasExistentes.map(labelSala)];
  }, [carregandoSalas, salasExistentes]);

  function trocarModoCriacao(modo) {
    if (modo === modoCriacao) return;
    setModoCriacao(modo);
    setSalaSelecionada(null);
    setForm(FORM_INICIAL);
    setErro("");
  }

  function selecionarSala(label) {
    if (label === SALA_SENTINELA) {
      setSalaSelecionada(null);
      setErro("");
      return;
    }
    const sala = salasExistentes.find((s) => labelSala(s) === label);
    setSalaSelecionada(sala || null);
    setForm((atual) => ({ ...atual, disciplina: "", professor: "", professorId: "" }));
    setErro("");
  }

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
    // 🛡️ TRAVA 1: Garante que temos o UID do usuário/escola autenticado
    const activeUid = uid || auth?.currentUser?.uid;
    if (!activeUid) {
      setErro("Usuário não identificado. Recarregue a página.");
      return;
    }

    if (!modoEdicao) {
      if (modoCriacao === "novo" && !form.curso.trim()) {
        setErro("Informe o nome do curso.");
        return;
      }
      if (modoCriacao === "existente" && !salaSelecionada) {
        setErro("Selecione a sala/curso existente.");
        return;
      }
    }
    if (!form.disciplina.trim()) { setErro("Informe a disciplina base da turma."); return; }

    if (!modoEdicao && modoCriacao === "existente" && salaSelecionada) {
      const jaTem = salaSelecionada.disciplinas.some(
        (d) => normalizarDisciplina(d) === normalizarDisciplina(form.disciplina)
      );
      if (jaTem) {
        setErro(`A sala "${salaSelecionada.nome}" já tem uma turma de ${form.disciplina}.`);
        return;
      }
    }

    setSalvando(true);
    setErro("");

    try {
      if (modoEdicao) {
        await atualizarTurma(activeUid, turmaParaEditar.id, {
          disciplina: form.disciplina,
          professor: form.professor,
          professorId: form.professorId || "" // 🛡️ Evita undefined
        });

        if (form.professorId && form.professorId !== turmaParaEditar.professorId) {
          await criarNotificacao({
            titulo: "Turma Atualizada",
            mensagem: `Você foi associado à turma "${turmaParaEditar.nome}" (${form.disciplina}) no período ${form.periodo}.`,
            tipo: "turma",
            link: "/turmas",
            destinatarioUids: [form.professorId],
            criadoPorNome: "Coordenação",
          }).catch(err => console.warn("Erro ao enviar notificação:", err));
        }
      } else {
        const usandoSalaExistente = modoCriacao === "existente" && salaSelecionada;

        const nomeTurmaFinal = usandoSalaExistente
          ? salaSelecionada.nome
          : `${form.ano} ${form.curso.trim()}${form.modular ? ' - Modular' : ''}`;
        const periodoFinal = usandoSalaExistente ? salaSelecionada.periodo : form.periodo;
        const nomePeriodoFormatado = `Período ${periodoFinal}`;

        await buscarOuCriarTurmaPeriodo(nomeTurmaFinal, nomePeriodoFormatado, activeUid);

        await criarTurma(activeUid, {
          nome: nomeTurmaFinal,
          disciplina: form.disciplina,
          periodo: periodoFinal,
          professor: form.professor || "",
          professorId: form.professorId || "" // 🛡️ Evita undefined
        });

        await criarNotificacaoPorRole({
          role: "professor",
          titulo: usandoSalaExistente ? "Nova disciplina na turma" : "Nova turma criada",
          mensagem: usandoSalaExistente
            ? `A disciplina ${form.disciplina} foi adicionada à turma ${nomeTurmaFinal} (${periodoFinal}).`
            : `A turma ${nomeTurmaFinal} (${periodoFinal}) foi adicionada com a disciplina ${form.disciplina}.`,
          tipo: "turma",
          link: "/arquivos",
          criadoPorUid: activeUid,
          criadoPorNome: professorLogado?.nome || "Coordenação"
        }).catch(err => console.warn("Erro ao enviar notificação global:", err));

        if (form.professorId) {
          await criarNotificacao({
            titulo: "Nova Turma Vinculada",
            mensagem: `Você foi associado à turma "${nomeTurmaFinal}" no período ${periodoFinal}.`,
            tipo: "turma",
            link: "/turmas",
            destinatarioUids: [form.professorId],
            criadoPorNome: "Coordenação",
          }).catch(err => console.warn("Erro ao enviar notificação individual:", err));
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      setErro(err.message || (modoEdicao ? "Erro ao atualizar a turma." : "Erro ao criar a turma."));
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
      <motion.div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 500,
          width: "100%",
          maxHeight: "85vh", 
          display: "flex", 
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          borderRadius: "12px",
          backgroundColor: "var(--branco, #ffffff)"
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", boxSizing: "border-box" }}>
          
          {/* 👇 INÍCIO DO AVISO PERMANENTE 👇 */}
          <div 
            role="alert"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              border: "1px solid rgba(217, 48, 37, 0.25)",
              borderRadius: "8px",
              backgroundColor: "#fff3f1",
              color: "#b42318",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.35,
              marginBottom: "20px"
            }}
          >
            <span 
              aria-hidden="true"
              style={{
                width: "20px",
                height: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: "#d93025",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700
              }}
            >
              !
            </span>
            Para que a criação das turmas em conjunto com os arquivos, será necessário que você já tenha criado as disciplinas e o cadastro dos professores. 
          </div>
          {/* 👆 FIM DO AVISO PERMANENTE 👆 */}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h3 className="modal-titulo" style={{ margin: 0, fontSize: 18 }}>
                {modoEdicao ? "Editar Turma" : "Criação Unificada de Turma"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--texto-sec)", margin: "4px 0 0" }}>
                {modoEdicao 
                  ? "Atualize a disciplina e o professor vinculados a esta turma." 
                  : "Cria a pasta nos Arquivos e o vínculo de disciplina nas Turmas."}
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--texto-sec)" }}>
              <X size={20} />
            </button>
          </div>

          {/* --- Alternância: sala nova x sala existente --- */}
          {!modoEdicao && (
            <div className="turma-modo-toggle">
              <button
                type="button"
                className={`turma-modo-btn ${modoCriacao === "novo" ? "ativo" : ""}`}
                onClick={() => trocarModoCriacao("novo")}
              >
                Nova sala/curso
              </button>
              <button
                type="button"
                className={`turma-modo-btn ${modoCriacao === "existente" ? "ativo" : ""}`}
                onClick={() => trocarModoCriacao("existente")}
              >
                Turma em sala existente
              </button>
            </div>
          )}

          {/* --- PASSO 1: DADOS BASE --- */}
          {modoEdicao ? (
            <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 6 }}>Turma</h4>
              <p style={{ fontSize: 13, color: "var(--texto)", margin: 0, fontWeight: 500 }}>
                {form.ano} {form.curso}{form.modular ? " - Modular" : ""} · {form.periodo}
              </p>
              <p style={{ fontSize: 11, color: "var(--texto-sec)", margin: "4px 0 0" }}>
                Ano, curso e período não podem ser alterados aqui — eles já definem a pasta em Arquivos.
              </p>
            </div>
          ) : modoCriacao === "novo" ? (
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
          ) : (
            <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8, marginBottom: 12 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>1. Escolha a sala</h4>

              {!carregandoSalas && salasExistentes.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--texto-sec)", margin: 0 }}>
                  Nenhuma sala cadastrada ainda. Use a aba "Nova sala/curso" para criar a primeira.
                </p>
              ) : (
                <DropdownComPortal
                  label="Sala / turma existente"
                  opcoes={opcoesSalasExistentes}
                  valor={salaSelecionada ? labelSala(salaSelecionada) : SALA_SENTINELA}
                  onChange={selecionarSala}
                  id="uni-sala-existente" dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
                />
              )}

              {salaSelecionada && salaSelecionada.disciplinas.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--texto-sec)", margin: "8px 0 0" }}>
                  Já cadastradas nessa sala: {salaSelecionada.disciplinas.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* --- PASSO 2: DISCIPLINA --- */}
          {(modoEdicao || modoCriacao === "novo" || salaSelecionada) && (
            <div style={{ padding: "12px", background: "var(--bg)", borderRadius: 8 }}>
              <h4 style={{ fontSize: 11, textTransform: "uppercase", color: "var(--roxo)", marginBottom: 10 }}>
                {modoEdicao ? "Disciplina e Professor" : "2. Vínculo de Disciplina"}
              </h4>
              
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
          )}

          {!modoEdicao && modoCriacao === "novo" && form.curso.trim() && form.disciplina && (
            <div style={{ background: "var(--roxo-claro)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--roxo)", fontWeight: 600, marginTop: 16 }}>
              Ação: Criando Arquivos e Turma ({form.disciplina}) para "{form.ano} {form.curso.trim()}{form.modular ? ' - Modular' : ''}"
            </div>
          )}

          {!modoEdicao && modoCriacao === "existente" && salaSelecionada && form.disciplina && (
            <div style={{ background: "var(--roxo-claro)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--roxo)", fontWeight: 600, marginTop: 16 }}>
              Ação: Adicionando a disciplina {form.disciplina} na sala "{salaSelecionada.nome}" ({salaSelecionada.periodo})
            </div>
          )}

          {erro && <p style={{ color: "#c0392b", fontSize: 12, margin: "12px 0 0" }}>{erro}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button className="perfil-salvar" onClick={handleSalvar} disabled={salvando} style={{ flex: 1 }}>
              {salvando ? (modoEdicao ? "Salvando..." : "Criando...") : (modoEdicao ? "Salvar Alterações" : "Criar Turma Unificada")}
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