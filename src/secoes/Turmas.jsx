import { useState, useEffect, useMemo } from "react";
import {
  buscarTurmas,
  deletarTurma,
  atualizarTurma,
  buscarRegistros,
  criarRegistroAula,
  deletarRegistro,
} from "../firebase/estrutura";
import "./secoes.css";
import { Trash2, AlertTriangle, X, Pencil } from "lucide-react";
import CustomDatePicker from "./dropdown-calendario";
import {
  criarNotificacao,
  criarNotificacaoPorRole,
} from "../notificacoes/notificacoes";
import useCoresDisciplinas from "../hooks/useCoresDisciplinas";
import { montarCoresDisciplina } from "./coresDisciplinas";
import ModalNovaTurmaUnificada from "../coordenador/ModalNovaTurmaUnificada";

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
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#FFF0F3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            animation:
              "confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
          }}
        >
          <AlertTriangle size={26} color="#ED235C" strokeWidth={2.2} />
        </div>

        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--texto)",
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          Remover turma?
        </h3>
        <p
          style={{
            fontSize: 15,
            color: "var(--texto-sec)",
            margin: "0 0 6px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Você está prestes a remover a turma
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 12,
            background: c.bg,
            margin: "0 0 6px",
            animation: "confirm-card-slide 0.3s ease 0.15s both",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: c.ativo,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.cor }}>
              {turma?.nome}
            </div>
            <div style={{ fontSize: 11, color: c.cor, opacity: 0.7 }}>
              {turma?.disciplina} · {turma?.periodo}
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--texto-sec)",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          Todos os registros de aula serão removidos permanentemente.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: "1px solid var(--borda)",
              background: "var(--branco)",
              fontSize: 15,
              fontFamily: "'Poppins', sans-serif",
              color: "var(--texto)",
              cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--roxo)";
              e.currentTarget.style.color = "var(--roxo)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.color = "#555";
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: "none",
              background: "#ED235C",
              fontSize: 15,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c71b4d";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ED235C";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
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
  const [turmaAberta, setTurmaAberta] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [painelRegistro, setPainelRegistro] = useState(false);
  const [registroAberto, setRegistroAberto] = useState(null);
  const [formRegistro, setFormRegistro] = useState(FORM_REGISTRO_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erroTurma, setErroTurma] = useState("");
  const [erroRegistro, setErroRegistro] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(null);
  const [confirmarDelete, setConfirmarDelete] = useState(null);
  const [turmaEditando, setTurmaEditando] = useState(null);
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);

  useEffect(() => {
    if (uid) carregarTurmas();
  }, [uid, professor?.role]);

  async function carregarTurmas() {
    setLoading(true);
    setErroTurma("");

    try {
      const dados = await buscarTurmas(uid, professor);
      setTurmas(dados);
      const discs = [...new Set(dados.map((t) => t.disciplina))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      setDisciplinas(discs);
      if (discs.length > 0) {
        setDisciplinaAtiva((atual) =>
          discs.includes(atual) ? atual : discs[0]
        );
      }
    } catch (erro) {
      console.error("Erro ao carregar turmas:", erro);
      setTurmas([]);
      setDisciplinas([]);
      setDisciplinaAtiva(null);
      setErroTurma(
        "Nao foi possivel carregar suas turmas. Verifique as permissoes do Firestore."
      );
    } finally {
      setLoading(false);
    }
  }

  async function abrirTurma(turma) {
    setTurmaAberta(turma);
    setErroRegistro("");

    try {
      const regs = await buscarRegistros(turma.ownerUid || uid, turma.id);
      setRegistros(regs);
    } catch (erro) {
      console.error("Erro ao carregar registros da turma:", erro);
      setRegistros([]);
      setErroRegistro("Nao foi possivel carregar os registros desta turma.");
    }
  }

  function handleEditarTurma(turma, e) {
    e.stopPropagation();
    setTurmaEditando(turma);
    setErroTurma("");
    setModalNovaTurmaAberto(true);
  }

  async function fecharModalNovaTurma() {
    setModalNovaTurmaAberto(false);
    setTurmaEditando(null);
    await carregarTurmas();
  }

  function handleDeletarTurma(turma, e) {
    e.stopPropagation();
    setConfirmarDelete(turma);
  }

  async function executarDelete() {
    if (!confirmarDelete) return;
    await deletarTurma(confirmarDelete.ownerUid || uid, confirmarDelete.id);

    try {
      await criarNotificacaoPorRole({
        role: "professor",
        titulo: "Turma removida",
        mensagem: `A turma "${confirmarDelete.nome}" (${confirmarDelete.disciplina} · ${confirmarDelete.periodo}) foi encerrada.`,
        tipo: "turma",
        link: "/turmas",
        criadoPorUid: uid,
        criadoPorNome: professor?.nome || "Coordenação",
      });
    } catch (err) {
      console.warn("Erro ao notificar remoção de turma:", err);
    }

    setConfirmarDelete(null);
    await carregarTurmas();
  }

  async function handleSalvarRegistro() {
    if (!isCoordenador) return;
    if (!formRegistro.data) {
      setErroRegistro("Informe a data da aula.");
      return;
    }
    if (!formRegistro.conteudo.trim()) {
      setErroRegistro("Informe o conteúdo da aula.");
      return;
    }
    setSalvando(true);
    try {
      const ownerUid = turmaAberta.ownerUid || uid;
      await criarRegistroAula(ownerUid, turmaAberta.id, formRegistro);
      const regs = await buscarRegistros(ownerUid, turmaAberta.id);
      setRegistros(regs);
      setPainelRegistro(false);
      setFormRegistro(FORM_REGISTRO_INICIAL);

      const destinatarios = turmaAberta.professorId
        ? [turmaAberta.professorId]
        : [];

      if (destinatarios.length > 0) {
        try {
          const dataFormatada = formRegistro.data
            .split("-")
            .reverse()
            .join("/");
          await criarNotificacao({
            titulo: "Novo registro de aula",
            mensagem: `Foi adicionado um registro de aula do dia ${dataFormatada} na turma ${turmaAberta.nome}: "${formRegistro.conteudo}".`,
            tipo: "turma",
            link: "/turmas",
            destinatarioUids: destinatarios,
            criadoPorUid: uid,
            criadoPorNome: professor?.nome || "Coordenação",
          });
        } catch (err) {
          console.warn("Erro ao notificar novo registro:", err);
        }
      }
    } catch {
      setErroRegistro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletarRegistro(registroId) {
    if (!isCoordenador) return;
    await deletarRegistro(
      turmaAberta.ownerUid || uid,
      turmaAberta.id,
      registroId
    );
    setRegistros((prev) => prev.filter((r) => r.id !== registroId));
  }

  const turmasFiltradas = turmas.filter(
    (t) => t.disciplina === disciplinaAtiva
  );

  // ══════════════════════════════════════
  //  TELA: registros de uma turma
  // ══════════════════════════════════════
  if (turmaAberta) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="card" style={{ position: "relative", minHeight: 400 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <button
                className="btn-voltar"
                onClick={() => {
                  setTurmaAberta(null);
                  setPainelRegistro(false);
                }}
              >
                ← Voltar
              </button>
              <div
                className="registro-info"
                style={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 16, color: "var(--texto)", fontWeight: 600 }}>
                    {turmaAberta.disciplina}
                  </div>
                  {turmaAberta.professor && (
                    <div style={{ fontSize: 12, color: "var(--roxo)", fontWeight: 500 }}>
                      Prof(a): {turmaAberta.professor}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 15, color: "var(--texto-sec)", wordBreak: "break-word" }}>
                  {turmaAberta.nome} · {turmaAberta.periodo}
                </div>
              </div>
            </div>
          </div>

          {erroRegistro && (
            <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 16px" }}>
              {erroRegistro}
            </p>
          )}

          {registros.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 15, color: "var(--texto-sec)" }}>
                Nenhum registro ainda.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {registros.map((r, idx) => {
                const tipo = COR_TIPO[r.tipo] || COR_TIPO.teorica;
                return (
                  <div
                    key={r.id}
                    className="registro-pill"
                    onClick={() => setRegistroAberto(r)}
                    style={{
                      background: tipo.bg,
                      animationDelay: `${idx * 50}ms`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ color: tipo.cor, fontSize: 15, flex: 1 }}>
                      Aula do dia {r.data.split("-").reverse().join("/")} —{" "}
                      {r.conteudo}
                    </span>
                    {isCoordenador && (
                      <button
                        className="arquivo-acao"
                        style={{ color: tipo.cor, opacity: 0.6 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletarRegistro(r.id);
                        }}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isCoordenador && (
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px solid var(--borda)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                className="btn-upload"
                style={{ marginTop: 0 }}
                onClick={() => {
                  setErroRegistro("");
                  setFormRegistro(FORM_REGISTRO_INICIAL);
                  setPainelRegistro(true);
                }}
              >
                + Novo registro
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, padding: "20px" }}>
          {Object.entries(COR_TIPO).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: v.bg, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "var(--texto)", fontWeight: 500, lineHeight: 1 }}>
                {v.label}
              </span>
            </div>
          ))}
        </div>

        {registroAberto && (
          <>
            <div
              onClick={() => setRegistroAberto(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1100, backdropFilter: "blur(2px)" }}
            />
            <div
              className="registro-modal"
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "100%", maxWidth: 480, background: "var(--branco)", borderRadius: 16, padding: 28,
                zIndex: 9999, boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                animation: "painel-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
                display: "flex", flexDirection: "column", gap: 16, maxHeight: "85vh",
                overflowY: "auto", overflowX: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: (COR_TIPO[registroAberto.tipo] || COR_TIPO.teorica).bg }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--texto-sec)", textTransform: "uppercase" }}>
                      {(COR_TIPO[registroAberto.tipo] || COR_TIPO.teorica).label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--texto)", margin: "0 0 2px" }}>
                    {registroAberto.data.split("-").reverse().join("/")}
                  </h3>
                  <p style={{ fontSize: 15, color: "var(--texto-sec)", margin: 0, fontWeight: 500 }}>
                    {registroAberto.conteudo}
                  </p>
                </div>
                <button
                  onClick={() => setRegistroAberto(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--roxo)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Descrição do Conteúdo
                  </h4>
                  <div style={{ fontSize: 14, color: "var(--texto)", lineHeight: 1.5, background: "var(--bg)", padding: 12, borderRadius: 8, border: "1px solid var(--borda)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {registroAberto.descricao || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Nenhuma descrição informada.</span>}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--roxo)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Informações Adicionais
                  </h4>
                  <div style={{ fontSize: 14, color: "var(--texto)", lineHeight: 1.5, background: "var(--bg)", padding: 12, borderRadius: 8, border: "1px solid var(--borda)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                    {registroAberto.informacoes || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Nenhuma informação adicional.</span>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {painelRegistro && (
          <>
            <div
              onClick={() => setPainelRegistro(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1100, backdropFilter: "blur(2px)" }}
            />
            <div
              className="registro-modal"
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "100%", maxWidth: 480, background: "var(--branco)", borderRadius: 16, padding: 28,
                zIndex: 9999, boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                animation: "painel-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
                display: "flex", flexDirection: "column", gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--texto)", margin: "0 0 2px" }}>
                    Novo registro de aula
                  </h3>
                  <p style={{ fontSize: 15, color: "var(--texto-sec)", margin: 0 }}>
                    {turmaAberta.disciplina} · {turmaAberta.nome}
                  </p>
                </div>
                <button
                  onClick={() => setPainelRegistro(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <CustomDatePicker
                value={formRegistro.data}
                onChange={(dataStr) => setFormRegistro({ ...formRegistro, data: dataStr })}
                registros={registros}
                dropdownAberto={dropdownAberto}
                setDropdownAberto={setDropdownAberto}
              />

              <div className="perfil-grupo">
                <label className="perfil-label">Conteúdo</label>
                <input
                  className="perfil-input"
                  value={formRegistro.conteudo}
                  onChange={(e) => setFormRegistro({ ...formRegistro, conteudo: e.target.value })}
                  placeholder="Digite o conteúdo que será aplicado na aula"
                />
              </div>

              <div className="perfil-grupo">
                <label className="perfil-label">Descrição do conteúdo</label>
                <textarea
                  className="perfil-input"
                  rows={2}
                  value={formRegistro.descricao}
                  onChange={(e) => setFormRegistro({ ...formRegistro, descricao: e.target.value })}
                  placeholder="Descreva o conteúdo que será aplicado na aula"
                />
              </div>

              <div className="perfil-grupo">
                <label className="perfil-label">Informações adicionais</label>
                <textarea
                  className="perfil-input"
                  rows={2}
                  value={formRegistro.informacoes}
                  onChange={(e) => setFormRegistro({ ...formRegistro, informacoes: e.target.value })}
                  placeholder="Digite outras informações"
                />
              </div>

              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {Object.entries(COR_TIPO).map(([key, v]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", marginLeft: 4 }}>
                      <input
                        type="radio"
                        name="tipo-registro"
                        value={key}
                        checked={formRegistro.tipo === key}
                        onChange={() => setFormRegistro({ ...formRegistro, tipo: key })}
                        style={{ accentColor: "var(--roxo)", width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 12, color: "var(--texto)" }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {erroRegistro && (
                <p style={{ color: "#c0392b", fontSize: 12, margin: 0 }}>{erroRegistro}</p>
              )}

              <button
                onClick={handleSalvarRegistro}
                disabled={salvando}
                style={{
                  marginTop: 10, width: "100%", padding: "14px", borderRadius: 40, border: "none",
                  background: "var(--roxo)", color: "#fff", fontSize: 14, fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.6 : 1,
                  transition: "opacity 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => { if (!salvando) e.currentTarget.style.transform = "scale(1.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {salvando ? "Salvando..." : "Salvar novo registro de aula"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  //  TELA: lista de turmas
  // ══════════════════════════════════════
  return (
    <div style={{ padding: "10px 0" }}>
      {/* --- HEADER --- */}
      <div
        style={{
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
            Turmas
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "4px 0 0" }}>
            Disciplinas ministradas
          </p>
        </div>
      </div>

      {erroTurma && (
        <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 16px" }}>
          {erroTurma}
        </p>
      )}

      {loading ? (
        <p className="secao-vazia">Carregando...</p>
      ) : turmas.length === 0 ? (
        <p className="secao-vazia">Nenhuma turma cadastrada.</p>
      ) : (
        <>
          {/* --- ABAS DE DISCIPLINA --- */}
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
                  onClick={() => setDisciplinaAtiva(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>
            {disciplinaAtiva}
          </p>

          {/* --- GRADE DE TURMAS (cor uniforme, sem período visível) --- */}
          <div className="turmas-grid">
            {turmasFiltradas.map((t, idx) => (
              <div key={t.id} style={{ position: "relative" }}>
                <button
                  className="turma-card-pill"
                  style={{
                    background: "#B199C7",
                    color: "#ffffff",
                    animationDelay: `${idx * 60}ms`,
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                  onClick={() => abrirTurma(t)}
                  title={t.periodo}
                >
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0, paddingRight: 32 }}>
                    <span
                      style={{
                        display: "block",
                        fontWeight: 600,
                        fontSize: 15,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.nome}
                    </span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 300, flexShrink: 0, marginRight: 10 }}>›</span>
                </button>

                {isCoordenador && (
                  <button
                    onClick={(e) => handleEditarTurma(t, e)}
                    style={{
                      position: "absolute", top: "50%", right: 58, transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", opacity: 0.7, transition: "opacity .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                    title="Editar turma"
                  >
                    <Pencil size={14} color="#ffffff" />
                  </button>
                )}
                {isCoordenador && (
                  <button
                    onClick={(e) => handleDeletarTurma(t, e)}
                    style={{
                      position: "absolute", top: "50%", right: 34, transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", opacity: 0.7, transition: "opacity .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                    title="Remover turma"
                  >
                    <Trash2 size={14} color="#ffffff" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {confirmarDelete && (
        <ModalConfirmar
          turma={confirmarDelete}
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDelete(null)}
        />
      )}

      {isCoordenador && modalNovaTurmaAberto && (
        <ModalNovaTurmaUnificada
          uid={uid}
          professorLogado={professor}
          turmaParaEditar={turmaEditando}
          onClose={fecharModalNovaTurma}
        />
      )}
    </div>
  );
}