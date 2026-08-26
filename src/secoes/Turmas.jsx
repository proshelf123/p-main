import { useState, useEffect, useMemo } from "react";
import {
  buscarTurmas,
  deletarTurma,
  atualizarRegistro,
  buscarRegistros,
  criarRegistroAula,
  deletarRegistro,
} from "../firebase/estrutura";
import "./secoes.css";
import { Trash2, AlertTriangle, X, Pencil, Users } from "lucide-react";
import CustomDatePicker from "./dropdown-calendario";
import {
  criarNotificacao,
  criarNotificacaoPorRole,
} from "../notificacoes/notificacoes";
import useCoresDisciplinas from "../hooks/useCoresDisciplinas";
import { montarCoresDisciplina } from "./coresDisciplinas";
import ModalNovaTurmaUnificada from "../coordenador/ModalNovaTurmaUnificada";
import { motion, AnimatePresence } from "motion/react";

// IMPORTANDO OS COMPONENTES DAS ABAS
import TurmasNotas from "./TurmasNotas";
import TurmaAvaliacoes from "./TurmaAvaliacoes"
import TurmaPresenca from "./TurmaPresenca"; // Certifique-se de que este arquivo existe!

const COR_TIPO = {
  teorica: { bg: "#0BDB23", cor: "#fff", label: "Aula teórica" },
  pratica: { bg: "#ED235C", cor: "#fff", label: "Aula Prática" },
  atividade: { bg: "#FFBB00", cor: "#fff", label: "Atividades" },
  avaliacao: { bg: "#188AF5", cor: "#fff", label: "Avaliações" },
};

const FORM_REGISTRO_INICIAL = {
  data: "",
  conteudo: "",
  descricao: "",
  informacoes: "",
  tipo: "teorica",
};

function coresDe(disciplina, coresCustomizadas = {}) {
  return montarCoresDisciplina(disciplina, coresCustomizadas);
}

// ── Modal de confirmação customizado ──────────────────────────
function ModalConfirmar({ turma, onConfirmar, onCancelar }) {
  const coresDisciplinas = useCoresDisciplinas();
  const c = coresDe(turma?.disciplina, coresDisciplinas);
  return (
    <>
      <div className="modal-confirmar-overlay" onClick={onCancelar} />
      <div className="modal-confirmar">
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "#FFF0F3",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          animation: "confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both"
        }}>
          <AlertTriangle size={26} color="#ED235C" strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--texto)", margin: "0 0 8px", textAlign: "center" }}>
          Remover turma?
        </h3>
        <p style={{ fontSize: 15, color: "var(--texto-sec)", margin: "0 0 6px", textAlign: "center", lineHeight: 1.5 }}>
          Você está prestes a remover a turma
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12,
          background: c.bg, margin: "0 0 6px", animation: "confirm-card-slide 0.3s ease 0.15s both"
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.ativo, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.cor }}>{turma?.nome}</div>
            <div style={{ fontSize: 11, color: c.cor, opacity: 0.7 }}>{turma?.disciplina} · {turma?.periodo}</div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--texto-sec)", margin: "0 0 20px", textAlign: "center" }}>
          Todos os registros de aula serão removidos permanentemente.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancelar} className="btn-cancelar" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 15 }}>
            Cancelar
          </button>
          <button onClick={onConfirmar} style={{
            flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#ED235C",
            fontSize: 15, fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: "#fff", cursor: "pointer"
          }}>
            Sim, remover
          </button>
        </div>
      </div>
    </>
  );
}

export default function Turmas({ uid, professor }) {
  const isCoordenador = professor?.role === "coordenador";
  const coresDisciplinas = useCoresDisciplinas();
  
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinaAtiva, setDisciplinaAtiva] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [erroTurma, setErroTurma] = useState("");
  
  // ── ESTADOS DE NAVEGAÇÃO DA TURMA ──
  const [turmaAberta, setTurmaAberta] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState("registros"); // "registros" | "notas" | "presenca"
  const [turmaExpandidaId, setTurmaExpandidaId] = useState(null); // Para o Accordion da lista
  const [subAbaNotas, setSubAbaNotas] = useState("resumo"); // "resumo" | "lancar" — novo

  
  // ── ESTADOS DOS REGISTROS ──
  const [registros, setRegistros] = useState([]);
  const [painelRegistro, setPainelRegistro] = useState(false);
  const [registroAberto, setRegistroAberto] = useState(null);
  const [formRegistro, setFormRegistro] = useState(FORM_REGISTRO_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erroRegistro, setErroRegistro] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(null);
  const [registroParaDeletar, setRegistroParaDeletar] = useState(null);
  const [registroEditando, setRegistroEditando] = useState(null);

  // ── ESTADOS DA COORDENAÇÃO ──
  const [confirmarDelete, setConfirmarDelete] = useState(null);
  const [turmaEditando, setTurmaEditando] = useState(null);
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);

  useEffect(() => {
    if (uid) carregarTurmas();
  }, [uid, professor?.role]);

  async function carregarTurmas() {
    setLoading(true); setErroTurma("");
    try {
      const dados = await buscarTurmas(uid, professor);
      setTurmas(dados);
      const discs = [...new Set(dados.map((t) => t.disciplina))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      setDisciplinas(discs);
      if (discs.length > 0) {
        setDisciplinaAtiva((atual) => discs.includes(atual) ? atual : discs[0]);
      }
    } catch (erro) {
      console.error("Erro ao carregar turmas:", erro);
      setTurmas([]); setDisciplinas([]); setDisciplinaAtiva(null);
      setErroTurma("Não foi possível carregar suas turmas.");
    } finally {
      setLoading(false);
    }
  }

  // Abre a turma e já direciona para a seção escolhida nos botões do accordion
  async function abrirSecaoTurma(turma, secao) {
    setTurmaAberta(turma);
    setSecaoAtiva(secao);
    setSubAbaNotas("resumo");
    setErroRegistro("");

    try {
      const regs = await buscarRegistros(turma.ownerUid || uid, turma.id);
      setRegistros(regs);
    } catch (erro) {
      console.error("Erro ao carregar registros:", erro);
      setRegistros([]);
      setErroRegistro("Não foi possível carregar os registros desta turma.");
    }
  }

  function fecharTurmaAberta() {
    setTurmaAberta(null);
    setPainelRegistro(false);
    setRegistroAberto(null);
    setSecaoAtiva("registros");
    setSubAbaNotas("resumo");
  }

  function handleEditarTurma(turma, e) {
    e.stopPropagation(); setTurmaEditando(turma); setErroTurma(""); setModalNovaTurmaAberto(true);
  }

  async function fecharModalNovaTurma() {
    setModalNovaTurmaAberto(false); setTurmaEditando(null); await carregarTurmas();
  }

  function handleDeletarTurma(turma, e) {
    e.stopPropagation(); setConfirmarDelete(turma);
  }

  async function executarDelete() {
    if (!confirmarDelete) return;
    await deletarTurma(confirmarDelete.ownerUid || uid, confirmarDelete.id);
    try {
      await criarNotificacaoPorRole({
        role: "professor", titulo: "Turma removida",
        mensagem: `A turma "${confirmarDelete.nome}" foi encerrada.`,
        tipo: "turma", link: "/turmas", criadoPorUid: uid, criadoPorNome: professor?.nome || "Coordenação",
      });
    } catch (err) {}
    setConfirmarDelete(null); await carregarTurmas();
  }

  async function handleSalvarRegistro() {
    if (!formRegistro.data) { setErroRegistro("Informe a data da aula."); return; }
    if (!formRegistro.conteudo.trim()) { setErroRegistro("Informe o conteúdo da aula."); return; }
    setSalvando(true);
    try {
      const ownerUid = turmaAberta.ownerUid || uid;
      if (registroEditando) {
        await atualizarRegistro(ownerUid, turmaAberta.id, registroEditando.id, formRegistro);
      } else {
        await criarRegistroAula(ownerUid, turmaAberta.id, formRegistro);
      }
      const regs = await buscarRegistros(ownerUid, turmaAberta.id);
      setRegistros(regs);
      setPainelRegistro(false);
      setFormRegistro(FORM_REGISTRO_INICIAL);
      setRegistroEditando(null);
    } catch {
      setErroRegistro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function handleEditarRegistro(registro, e) {
    e.stopPropagation(); setErroRegistro(""); setRegistroEditando(registro);
    setFormRegistro({
      data: registro.data, conteudo: registro.conteudo, descricao: registro.descricao || "",
      informacoes: registro.informacoes || "", tipo: registro.tipo || "teorica",
    });
    setPainelRegistro(true);
  }

  async function handleDeletarRegistro(registroId) {
    await deletarRegistro(turmaAberta.ownerUid || uid, turmaAberta.id, registroId);
    setRegistros((prev) => prev.filter((r) => r.id !== registroId));
  }

  const turmasFiltradas = turmas.filter((t) => t.disciplina === disciplinaAtiva);

  // ══════════════════════════════════════
  //  TELA 2: DENTRO DA TURMA (Registros, Notas ou Presença)
  // ══════════════════════════════════════
  if (turmaAberta) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* HEADER DA TURMA */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
              <button className="btn-voltar" onClick={fecharTurmaAberta}>
                ← Voltar
              </button>
              <div className="registro-info" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 16, color: "var(--texto)", fontWeight: 600 }}>{turmaAberta.disciplina}</div>
                  {turmaAberta.professor && (
                    <div style={{ fontSize: 12, color: "var(--roxo)", fontWeight: 500 }}>Prof(a): {turmaAberta.professor}</div>
                  )}
                </div>
                <div style={{ fontSize: 15, color: "var(--texto-sec)", wordBreak: "break-word" }}>
                  {turmaAberta.nome} · {turmaAberta.periodo}
                </div>
              </div>
            </div>

{/* SELETOR DE ABAS COM DESLIZAMENTO (Sliding Pill) */}
            <div
              style={{
                position: "relative",
                display: "flex",
                background: "var(--bg)",
                padding: "6px",
                borderRadius: "30px",
                width: "320px", // Define uma largura fixa para os 3 caberem certinho
              }}
            >
              {/* --- A PÍLULA ROXA QUE DESLIZA AO FUNDO --- */}
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  bottom: "6px",
                  left: "6px",
                  width: "calc((100% - 12px) / 3)", // Exatamente 1/3 do espaço interno
                  background: "var(--roxo)",
                  borderRadius: "24px",
                  zIndex: 1,
                  // A mágica acontece aqui: uma transição suave baseada na aba ativa
                  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: `translateX(${
                    secaoAtiva === "registros" ? "0%" :
                    secaoAtiva === "notas" ? "100%" : "200%"
                  })`,
                }}
              />

              {/* --- OS 3 BOTÕES TRANSPARENTES POR CIMA --- */}
              {[
                { id: "registros", label: "Registros" },
                { id: "notas", label: "Notas" },
                { id: "presenca", label: "Presença" }
              ].map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setSecaoAtiva(aba.id)}
                  style={{
                    flex: 1,
                    position: "relative",
                    zIndex: 2, // Fica acima da pílula roxa
                    border: "none",
                    background: "transparent",
                    padding: "8px 0",
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    // Se for a aba ativa, a fonte fica branca; senão, cinza
                    color: secaoAtiva === aba.id ? "#fff" : "var(--texto-sec)",
                    cursor: "pointer",
                    transition: "color 0.3s ease", // Transição suave na troca de cor da letra
                  }}
                >
                  {aba.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTEÚDO CONDICIONAL DA ABA ── */}

        {secaoAtiva === "registros" && (
          <>
            <div className="card" style={{ minHeight: 300 }}>
              {erroRegistro && <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 16px" }}>{erroRegistro}</p>}

              {registros.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ fontSize: 15, color: "var(--texto-sec)" }}>Nenhum registro ainda.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {registros.map((r, idx) => {
                    const tipo = COR_TIPO[r.tipo] || COR_TIPO.teorica;
                    return (
                      <div key={r.id} className="registro-pill" onClick={() => setRegistroAberto(r)} style={{ background: tipo.bg, animationDelay: `${idx * 50}ms`, cursor: "pointer" }}>
                        <span style={{ color: tipo.cor, fontSize: 15, flex: 1 }}>
                          Aula do dia {r.data.split("-").reverse().join("/")} — {r.conteudo}
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="arquivo-acao" style={{ color: tipo.cor, opacity: 0.6 }} onClick={(e) => handleEditarRegistro(r, e)} title="Editar"><Pencil size={14} /></button>
                          <button className="arquivo-acao" style={{ color: tipo.cor, opacity: 0.6 }} onClick={(e) => { e.stopPropagation(); setRegistroParaDeletar(r); }} title="Remover"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--borda)", display: "flex", justifyContent: "center" }}>
                <button className="btn-upload" style={{ marginTop: 0 }} onClick={() => { setErroRegistro(""); setFormRegistro(FORM_REGISTRO_INICIAL); setPainelRegistro(true); }}>
                  + Novo registro
                </button>
              </div>
            </div>

            {/* LEGENDA DE CORES DOS REGISTROS */}
            <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, padding: "20px" }}>
              {Object.entries(COR_TIPO).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: v.bg, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "var(--texto)", fontWeight: 500, lineHeight: 1 }}>{v.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

{secaoAtiva === "notas" && (
  <>
    {!isCoordenador && (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[          
          { id: "lancar", label: "Lançar avaliações" },
          { id: "resumo", label: "Ver totais" },
        ].map((aba) => (
          <motion.button
            key={aba.id}
            onClick={() => setSubAbaNotas(aba.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              position: "relative",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--borda)",
              background: "transparent",
              color: subAbaNotas === aba.id ? "#fff" : "var(--texto)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              overflow: "hidden",
              transition: "color 0.2s ease",
            }}
          >
            {subAbaNotas === aba.id && (
              <motion.div
                layoutId="pill-sub-notas"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--roxo)",
                  borderRadius: 7,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{aba.label}</span>
          </motion.button>
        ))}
      </div>
    )}

    <AnimatePresence mode="wait">
      {isCoordenador || subAbaNotas === "resumo" ? (
        <motion.div
          key="resumo"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <TurmasNotas turma={turmaAberta} uid={uid} professor={professor} />
        </motion.div>
      ) : (
        <motion.div
          key="lancar"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <TurmaAvaliacoes turma={turmaAberta} uid={uid} professor={professor} />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}

        {secaoAtiva === "presenca" && (
          <TurmaPresenca turma={turmaAberta} uid={uid} professor={professor} />
        )}

        {/* ========================================= */}
        {/* MODAIS (Manter como estavam) */}
        {/* ========================================= */}
        {registroAberto && (
          <>
            <div onClick={() => setRegistroAberto(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1100, backdropFilter: "blur(2px)" }} />
            <div className="registro-modal" style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: 480, background: "var(--branco)", borderRadius: 16, padding: 28, zIndex: 10000000, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", gap: 16, maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--texto)", margin: "0 0 2px" }}>{registroAberto.data.split("-").reverse().join("/")}</h3>
                  <p style={{ fontSize: 15, color: "var(--texto-sec)", margin: 0, fontWeight: 500 }}>{registroAberto.conteudo}</p>
                </div>
                <button onClick={() => setRegistroAberto(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}><X size={20} /></button>
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--roxo)", marginBottom: 4 }}>Descrição</h4>
                  <div style={{ fontSize: 14, color: "var(--texto)", background: "var(--bg)", padding: 12, borderRadius: 8, border: "1px solid var(--borda)" }}>{registroAberto.descricao || "Nenhuma descrição informada."}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {painelRegistro && (
          <>
            <div onClick={() => setPainelRegistro(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1100, backdropFilter: "blur(2px)" }} />
            <div className="registro-modal" style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: 480, background: "var(--branco)", borderRadius: 16, padding: 28, zIndex: 10000000, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", gap: 16, maxHeight: "95vh", overflow: dropdownAberto ? "visible" : "auto", boxSizing: "border-box"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--texto)", margin: "0 0 2px" }}>{registroEditando ? "Editar registro" : "Novo registro"}</h3>
                  <p style={{ fontSize: 15, color: "var(--texto-sec)", margin: 0 }}>{turmaAberta.disciplina} · {turmaAberta.nome}</p>
                </div>
                <button onClick={() => setPainelRegistro(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}><X size={20} /></button>
              </div>

              <div onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <CustomDatePicker value={formRegistro.data} onChange={(dataStr) => setFormRegistro({ ...formRegistro, data: dataStr })} registros={registros} dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto} />
              </div>

              <div className="perfil-grupo">
                <label className="perfil-label">Conteúdo</label>
                <input className="perfil-input" value={formRegistro.conteudo} onChange={(e) => setFormRegistro({ ...formRegistro, conteudo: e.target.value })} placeholder="Digite o conteúdo" />
              </div>

              <div className="perfil-grupo">
                <label className="perfil-label">Descrição do conteúdo</label>
                <textarea className="perfil-input" rows={2} value={formRegistro.descricao} onChange={(e) => setFormRegistro({ ...formRegistro, descricao: e.target.value })} placeholder="Descreva o conteúdo" />
              </div>

              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {Object.entries(COR_TIPO).map(([key, v]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input type="radio" name="tipo-registro" value={key} checked={formRegistro.tipo === key} onChange={() => setFormRegistro({ ...formRegistro, tipo: key })} style={{ accentColor: "var(--roxo)", width: 16, height: 16 }} />
                      <span style={{ fontSize: 12, color: "var(--texto)" }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleSalvarRegistro} disabled={salvando} className="perfil-salvar" style={{ marginTop: 10 }}>
                {salvando ? "Salvando..." : "Salvar registro"}
              </button>
            </div>
          </>
        )}

        {registroParaDeletar && (
          <>
            <div className="modal-confirmar-overlay" onClick={() => setRegistroParaDeletar(null)} style={{ zIndex: 99999 }} />
            <div className="modal-confirmar" style={{ zIndex: 100000 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>Remover registro?</h3>
              <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
                Apagar o registro: <b>{registroParaDeletar.conteudo}</b>?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRegistroParaDeletar(null)} className="btn-cancelar" style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 13 }}>Cancelar</button>
                <button onClick={() => { handleDeletarRegistro(registroParaDeletar.id); setRegistroParaDeletar(null); }} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ED235C', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Sim, remover</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  //  TELA 1: LISTA DE TURMAS (Com Accordion)
  // ══════════════════════════════════════
  return (
    <div>
      <div className='crono-topo'>
        <div style={{ width: "100%", marginBottom: "32px", paddingBottom: "24px", borderBottom: "1px solid var(--borda)" }}>
          <div style={{ paddingLeft: "15px", borderLeft: "3px solid var(--roxo)" }}>
            <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0 }}>Turmas</h2>
            <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>Suas disciplinas ministradas.</p>
          </div>
        </div>
      </div>

      {erroTurma && <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 16px" }}>{erroTurma}</p>}

      {loading ? (
        <p className="secao-vazia">Carregando...</p>
      ) : turmas.length === 0 ? (
        <p className="secao-vazia">Nenhuma turma cadastrada.</p>
      ) : (
        <>
          <div className="turma-tabs" style={{ marginBottom: 28 }}>
            {disciplinas.map((d) => {
              const c = coresDe(d, coresDisciplinas);
              const ativa = disciplinaAtiva === d;
              return (
                <button
                  key={d}
                  className="turma-tab-pill"
                  style={{
                    background: ativa ? c.ativo : "var(--roxo-claro)",
                    color: ativa ? c.textoSobreAtivo : "var(--texto)",
                    borderColor: ativa ? c.ativo : "transparent",
                    transform: ativa ? "scale(1.05)" : "scale(1)",
                  }}
                  onClick={() => { setDisciplinaAtiva(d); setTurmaExpandidaId(null); }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>{disciplinaAtiva}</p>

          <div className="turmas-grid">
            {turmasFiltradas.map((t) => {
              const expandida = turmaExpandidaId === t.id;
              
              return (
                <div key={t.id} style={{ position: "relative" }}>
                  <div className={`turma-expand-card ${expandida ? "aberto" : ""}`}>
                    
                    {/* Botão que ativa/fecha o Accordion */}
                    <button
                      className="turma-expand-trigger"
                      onClick={() => setTurmaExpandidaId(expandida ? null : t.id)}
                      title={t.periodo}
                    >
                      <div style={{ textAlign: "left", flex: 1, minWidth: 0, paddingRight: 48 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 15, wordBreak: "break-word" }}>
                          {t.nome}
                        </span>
                      </div>
                      <span className={`turma-expand-seta ${expandida ? "girada" : ""}`}>›</span>
                    </button>

                    {/* Botões de Ação do Coordenador (Editar/Remover) */}
                    {isCoordenador && (
                      <div style={{ position: "absolute", top: 14, right: 38, display: "flex", gap: 6, zIndex: 2 }}>
                        <button onClick={(e) => handleEditarTurma(t, e)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.8 }} title="Editar turma">
                          <Pencil size={14} color="#ffffff" />
                        </button>
                        <button onClick={(e) => handleDeletarTurma(t, e)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.8 }} title="Remover turma">
                          <Trash2 size={14} color="#ffffff" />
                        </button>
                      </div>
                    )}

                    {/* Área Expandida com as 3 opções */}
                    <div className={`turma-expand-corpo ${expandida ? "visivel" : ""}`}>
                      <div className="turma-expand-inner">
                        <div className="turma-acoes-grid">
                          <button className="turma-btn-acao" onClick={() => abrirSecaoTurma(t, "registros")}>
                            Registros
                          </button>
                          <button className="turma-btn-acao" onClick={() => abrirSecaoTurma(t, "notas")}>
                            Notas
                          </button>
                          <button className="turma-btn-acao" onClick={() => abrirSecaoTurma(t, "presenca")}>
                            Presença
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmarDelete && <ModalConfirmar turma={confirmarDelete} onConfirmar={executarDelete} onCancelar={() => setConfirmarDelete(null)} />}
      {isCoordenador && modalNovaTurmaAberto && <ModalNovaTurmaUnificada uid={uid} professorLogado={professor} turmaParaEditar={turmaEditando} onClose={fecharModalNovaTurma} />}
    </div>
  );
}