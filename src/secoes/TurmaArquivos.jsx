// src/components/TurmaArquivos.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FileSpreadsheet, File, FolderOpen, Send, CheckCircle, Trash2 } from "lucide-react";
import { 
  criarSolicitacaoArquivo, 
  escutarSolicitacoes, 
  escutarArquivosDaTurma, 
  aprovarEAdicionarArquivo,
  deletarArquivoAprovado
} from "../firebase/estrutura";

export default function TurmaArquivos({ turmaId, titulo, perfil, onClose }) {
  // Se o perfil não vier carregado por parâmetro, assume papel padrão por segurança
  const isCoordenador = perfil?.role === "coordenador";
  const usuarioFormatado = {
    uid: perfil?.uid || "user_id_temp",
    nome: perfil?.nome || "Utilizador Conectado"
  };

  const [arquivos, setArquivos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  
  const [modalSolicitarAberto, setModalSolicitarAberto] = useState(false);
  const [novaSolicitacao, setNovaSolicitacao] = useState({ nome: "", descricao: "" });
  const [enviando, setEnviando] = useState(false);

  // Sincronização em tempo real com as duas coleções do Firestore
  useEffect(() => {
    if (!turmaId) return;

    const unsubArquivos = escutarArquivosDaTurma(turmaId, (dados) => setArquivos(dados));
    const unsubSolicitacoes = escutarSolicitacoes(turmaId, (dados) => setSolicitacoes(dados));

    return () => {
      unsubArquivos();
      unsubSolicitacoes();
    };
  }, [turmaId]);

  // Handler: Professor pede arquivo para a Coordenação
  async function handleEnviarSolicitacao(e) {
    e.preventDefault();
    if (!novaSolicitacao.nome.trim()) return;

    setEnviando(true);
    try {
      await criarSolicitacaoArquivo(turmaId, novaSolicitacao, usuarioFormatado);
      setNovaSolicitacao({ nome: "", descricao: "" });
      setModalSolicitarAberto(false);
    } catch (err) {
      console.error("Erro ao submeter pedido:", err);
    } finally {
      setEnviando(false);
    }
  }

  // Handler: Coordenador aprova o pedido e anexa as propriedades
  async function handleAprovar(solicitacao) {
    const mockMetaArquivo = {
      tipo: solicitacao.nome.split('.').pop().toLowerCase() || "pdf",
      tamanho: `${Math.floor(Math.random() * 400) + 50} KB`
    };

    try {
      await aprovarEAdicionarArquivo(solicitacao, mockMetaArquivo, usuarioFormatado);
    } catch (err) {
      console.error("Erro ao validar aprovação:", err);
    }
  }

  function getIconeArquivo(tipo) {
    if (tipo === "pdf") return <FileText size={24} color="#EF4444" />;
    if (["xlsx", "xls", "csv"].includes(tipo)) return <FileSpreadsheet size={24} color="#10B981" />;
    return <File size={24} color="#6B7280" />;
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header Interno */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{titulo}</h2>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0 0" }}>Documentos e solicitações da turma</p>
        </div>
        
        {!isCoordenador && (
          <button
            onClick={() => setModalSolicitarAberto(true)}
            style={{
              background: "#6F3B9D", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(111,59,157,0.2)"
            }}
          >
            <Send size={14} /> Solicitar Arquivo
          </button>
        )}
      </div>

      {/* Grid Central */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        
        {/* Bloco de Arquivos Disponíveis */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Arquivos da Turma ({arquivos.length})
          </h3>
          {arquivos.length === 0 ? (
            <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: "32px 16px", textAlign: "center", color: "#9ca3af" }}>
              <FolderOpen size={32} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum documento disponível nesta pasta.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {arquivos.map((arq) => (
                <div key={arq.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#f9fafb", borderRadius: 10, border: "0.5px solid #e5e7eb" }}>
                  {getIconeArquivo(arq.tipo)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{arq.nome}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>Tamanho: {arq.tamanho} • Por: {arq.enviadoPor}</div>
                  </div>
                  {isCoordenador && (
                    <button onClick={() => deletarArquivoAprovado(arq.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.7 }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco de Fluxo de Solicitações */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Fila de Pedidos à Coordenação
          </h3>
          {solicitacoes.length === 0 ? (
            <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Nenhum pedido efetuado até ao momento.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {solicitacoes.map((sol) => (
                <div key={sol.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginRight: 8, background: sol.status === "pendente" ? "#fef3c7" : "#d1fae5", color: sol.status === "pendente" ? "#d97706" : "#065f46" }}>
                      {sol.status.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: 13, color: "#374151" }}>{sol.nome}</strong>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Pedido por: {sol.professorNome}</div>
                  </div>

                  {isCoordenador && sol.status === "pendente" && (
                    <button
                      onClick={() => handleAprovar(sol)}
                      style={{
                        background: "#10B981", color: "#fff", border: "none", borderRadius: 6,
                        padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      <CheckCircle size={14} /> Aprovar e Inserir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal Lateral / Flutuante: Solicitar Novo Arquivo */}
      <AnimatePresence>
        {modalSolicitarAberto && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "#1f2937" }}>Nova Solicitação</h4>
              <form onSubmit={handleEnviarSolicitacao}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 6 }}>Nome Exato do Arquivo/Documento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ata_Reuniao_Abril.pdf"
                  value={novaSolicitacao.nome}
                  onChange={e => setNovaSolicitacao({ ...novaSolicitacao, nome: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, marginBottom: 16, outline: "none" }}
                />
                
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 6 }}>Justificação / Observações</label>
                <textarea
                  placeholder="Explique à coordenação o motivo deste documento..."
                  value={novaSolicitacao.descricao}
                  onChange={e => setNovaSolicitacao({ ...novaSolicitacao, descricao: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, minHeight: 70, marginBottom: 20, outline: "none", resize: "none" }}
                />

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setModalSolicitarAberto(false)} style={{ padding: "8px 16px", background: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#4b5563", cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" disabled={enviando} style={{ padding: "8px 16px", background: "#6F3B9D", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    {enviando ? "A enviar..." : "Enviar Pedido"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}