import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Simulação de usuário logado ───────────────────────────────────────────────
// Troque "coordenador" por "professor" para ver a outra visão
const USUARIO_ATUAL = {
  nome: "Prof. Ana Lima",
  papel: "professor", // "coordenador" | "professor"
};

// ─── Dados mockados de arquivos ────────────────────────────────────────────────
const arquivosMock = [
  {
    id: 1,
    nome: "Plano de Ensino 2025.pdf",
    tipo: "pdf",
    tamanho: "348 KB",
    enviadoPor: "Coord. Carlos Melo",
    data: "12/05/2025",
  },
  {
    id: 2,
    nome: "Calendário Acadêmico.xlsx",
    tipo: "xlsx",
    tamanho: "120 KB",
    enviadoPor: "Coord. Carlos Melo",
    data: "10/05/2025",
  },
];

const solicitacoesMock = [
  {
    id: 1,
    professor: "Prof. João Silva",
    descricao: "Ata da reunião pedagógica de abril",
    status: "pendente",
    data: "20/05/2025",
  },
];

export default function TurmaArquivos({ turma, periodo, onVoltar }) {
  const [arquivos, setArquivos] = useState(arquivosMock);
  const [solicitacoes, setSolicitacoes] = useState(solicitacoesMock);
  const [abaAtiva, setAbaAtiva] = useState("arquivos");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const isCoord = USUARIO_ATUAL.papel === "coordenador";

  // Upload simulado (coordenador)
  const [novoArquivo, setNovoArquivo] = useState({ nome: "", tipo: "pdf" });
  const handleUpload = () => {
    if (!novoArquivo.nome.trim()) return;
    setArquivos((prev) => [
      ...prev,
      {
        id: Date.now(),
        nome: novoArquivo.nome,
        tipo: novoArquivo.tipo,
        tamanho: "— KB",
        enviadoPor: USUARIO_ATUAL.nome,
        data: new Date().toLocaleDateString("pt-BR"),
      },
    ]);
    setNovoArquivo({ nome: "", tipo: "pdf" });
    setShowUploadModal(false);
  };

  // Solicitação simulada (professor)
  const [novaSolicitacao, setNovaSolicitacao] = useState("");
  const handleSolicitar = () => {
    if (!novaSolicitacao.trim()) return;
    setSolicitacoes((prev) => [
      ...prev,
      {
        id: Date.now(),
        professor: USUARIO_ATUAL.nome,
        descricao: novaSolicitacao,
        status: "pendente",
        data: new Date().toLocaleDateString("pt-BR"),
      },
    ]);
    setNovaSolicitacao("");
    setShowSolicitarModal(false);
    setAbaAtiva("solicitacoes");
  };

  // Aprovar solicitação (coordenador)
  const handleAprovar = (id) => {
    setSolicitacoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "aprovada" } : s))
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", padding: "32px 40px" }}>
      {/* Topo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <button
          onClick={onVoltar}
          style={{
            background: "none",
            border: "none",
            color: periodo.cor,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
            height: 30,
            marginBottom: 50,
            display: "flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 6,
          }}
        >
          ← Voltar para Arquivos
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: periodo.cor,
                  background: periodo.cor + "15",
                  padding: "2px 10px",
                  borderRadius: 99,
                }}
              >
                {periodo.nome}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A2E", margin: 0 }}>
              {turma}
            </h1>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Badge do usuário */}
            <div
              style={{
                background: isCoord ? "#7C3AED15" : "#059669" + "15",
                border: `1px solid ${isCoord ? "#7C3AED30" : "#05966930"}`,
                borderRadius: 99,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: isCoord ? "#7C3AED" : "#059669",
              }}
            >
              {isCoord ? " Coordenador" : " Professor"} · {USUARIO_ATUAL.nome}
            </div>

            {isCoord ? (
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  background: periodo.cor,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ↑ Enviar arquivo
              </button>
            ) : (
              <button
                onClick={() => setShowSolicitarModal(true)}
                style={{
                  background: periodo.cor,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Pedir upload
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Abas */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          background: "#fff",
          borderRadius: 12,
          padding: 4,
          border: "1px solid #E5E7EB",
          width: "fit-content",
        }}
      >
        {["arquivos", "solicitacoes"].map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            style={{
              padding: "7px 20px",
              borderRadius: 9,
              border: "none",
              background: abaAtiva === aba ? periodo.cor : "transparent",
              color: abaAtiva === aba ? "#fff" : "#6B7280",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {aba === "arquivos" ? ` Arquivos (${arquivos.length})` : ` Solicitações (${solicitacoes.filter(s => s.status === "pendente").length})`}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        {abaAtiva === "arquivos" ? (
          <motion.div
            key="arquivos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {arquivos.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1.5px dashed #E5E7EB",
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#9CA3AF",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}></div>
                <p style={{ fontWeight: 600, margin: 0 }}>Nenhum arquivo ainda.</p>
                {isCoord && (
                  <p style={{ fontSize: 13, marginTop: 4 }}>
                    Clique em "Enviar arquivo" para adicionar.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {arquivos.map((arq, i) => {
                  const { emoji, cor } =
                    [arq.tipo];
                  return (
                    <motion.div
                      key={arq.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        background: "#fff",
                        border: "1.5px solid #E5E7EB",
                        borderRadius: 12,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#1A1A2E",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {arq.nome}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "#9CA3AF",
                            marginTop: 2,
                          }}
                        >
                          {arq.tamanho} · Enviado por {arq.enviadoPor} em {arq.data}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          style={{
                            background: "#F3F4F6",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            cursor: "pointer",
                          }}
                        >
                          ↓ Baixar
                        </button>
                        {isCoord && (
                          <button
                            onClick={() => setShowDeleteConfirm(arq.id)}
                            style={{
                              background: "#FEE2E2",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#EF4444",
                              cursor: "pointer",
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="solicitacoes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {solicitacoes.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1.5px dashed #E5E7EB",
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#9CA3AF",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}></div>
                <p style={{ fontWeight: 600, margin: 0 }}>Nenhuma solicitação ainda.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {solicitacoes.map((sol, i) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div style={{ flexGrow: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1A1A2E",
                        }}
                      >
                        {sol.descricao}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#9CA3AF",
                          marginTop: 2,
                        }}
                      >
                        Solicitado por {sol.professor} em {sol.data}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 99,
                          padding: "3px 10px",
                          background:
                            sol.status === "aprovada" ? "#D1FAE5" : "#FEF3C7",
                          color:
                            sol.status === "aprovada" ? "#059669" : "#D97706",
                        }}
                      >
                        {sol.status === "aprovada" ? "✓ Aprovada" : " Pendente"}
                      </span>
                      {isCoord && sol.status === "pendente" && (
                        <button
                          onClick={() => handleAprovar(sol.id)}
                          style={{
                            background: "#D1FAE5",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#059669",
                            cursor: "pointer",
                          }}
                        >
                          Aprovar
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Upload (Coordenador) ── */}
      <AnimatePresence>
        {showUploadModal && (
          <Modal titulo="Enviar Arquivo" onClose={() => setShowUploadModal(false)}>
            <label style={labelStyle}>Nome do arquivo</label>
            <input
              value={novoArquivo.nome}
              onChange={(e) => setNovoArquivo((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Plano de Ensino 2025.pdf"
              style={inputStyle}
            />
            <label style={labelStyle}>Tipo</label>
            <select
              value={novoArquivo.tipo}
              onChange={(e) => setNovoArquivo((p) => ({ ...p, tipo: e.target.value }))}
              style={inputStyle}
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="docx">Word (.docx)</option>
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="outro">Outro</option>
            </select>
            <div
              style={{
                border: "2px dashed #E5E7EB",
                borderRadius: 10,
                padding: "24px",
                textAlign: "center",
                color: "#9CA3AF",
                fontSize: 13,
                marginTop: 4,
              }}
            >
             Clique para selecionar ou arraste o arquivo aqui
            </div>
            <button onClick={handleUpload} style={{ ...btnPrimary, background: periodo.cor, marginTop: 12 }}>
              ↑ Enviar
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Solicitar (Professor) ── */}
      <AnimatePresence>
        {showSolicitarModal && (
          <Modal titulo="Solicitar Upload" onClose={() => setShowSolicitarModal(false)}>
            <p style={{ color: "#6B7280", fontSize: 13, margin: "0 0 16px" }}>
              Descreva o arquivo que você precisa. O coordenador será notificado.
            </p>
            <label style={labelStyle}>Descrição do arquivo</label>
            <textarea
              value={novaSolicitacao}
              onChange={(e) => setNovaSolicitacao(e.target.value)}
              placeholder="Ex: Ata da reunião pedagógica de maio..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button onClick={handleSolicitar} style={{ ...btnPrimary, background: periodo.cor, marginTop: 12 }}>
              Enviar solicitação
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Confirmar exclusão ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <Modal titulo="Excluir arquivo?" onClose={() => setShowDeleteConfirm(null)}>
            <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 20px" }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{ ...btnPrimary, background: "#F3F4F6", color: "#374151", flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setArquivos((prev) => prev.filter((a) => a.id !== showDeleteConfirm));
                  setShowDeleteConfirm(null);
                }}
                style={{ ...btnPrimary, background: "#EF4444", flex: 1 }}
              >
                Excluir
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Componente Modal ──────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "#00000040",
          zIndex: 100,
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.22 }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 440,
          zIndex: 101,
          boxShadow: "0 24px 60px #0003",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1A1A2E", margin: 0 }}>
            {titulo}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}

// ── Estilos utilitários ───────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
  marginTop: 12,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 9,
  border: "1.5px solid #E5E7EB",
  fontSize: 13,
  color: "#1A1A2E",
  outline: "none",
  boxSizing: "border-box",
  background: "#F9FAFB",
};

const btnPrimary = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 10,
  border: "none",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};