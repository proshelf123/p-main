// src/components/TurmaArquivos.jsx
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ExternalLink, FileText, FileSpreadsheet, File, FolderOpen, Send, CheckCircle, XCircle, Trash2, Upload } from "lucide-react";
import { 
  criarSolicitacaoArquivo, 
  escutarSolicitacoes, 
  escutarArquivosDaTurma, 
  aprovarEAdicionarArquivo,
  recusarSolicitacaoArquivo,
  deletarArquivoAprovado
} from "../firebase/estrutura";

export default function TurmaArquivos({ turmaId: turmaIdProp, titulo: tituloProp, perfil, uid, onClose, onVoltar, turma, periodo }) {
  const idTurma = turmaIdProp || [periodo?.nome, turma].filter(Boolean).join(" - ");
  const tituloTurma = tituloProp || turma || "Arquivos da turma";
  const handleVoltar = onVoltar || onClose;
  // Se o perfil não vier carregado por parâmetro, assume papel padrão por segurança
  const isCoordenador = perfil?.role === "coordenador";
  const usuarioFormatado = {
    uid: perfil?.uid || perfil?.id || uid || "user_id_temp",
    nome: perfil?.nome || perfil?.displayName || "Usuário Conectado"
  };

  const [arquivos, setArquivos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  
  const [modalSolicitarAberto, setModalSolicitarAberto] = useState(false);
  const [novaSolicitacao, setNovaSolicitacao] = useState({ nome: "", descricao: "", arquivo: null });
  const [erroSolicitacao, setErroSolicitacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [processandoSolicitacaoId, setProcessandoSolicitacaoId] = useState("");

  // Sincronização em tempo real com as duas coleções do Firestore
  useEffect(() => {
    if (!idTurma) return;

    const unsubArquivos = escutarArquivosDaTurma(idTurma, (dados) => setArquivos(dados));
    const unsubSolicitacoes = escutarSolicitacoes(idTurma, (dados) => setSolicitacoes(dados));

    return () => {
      unsubArquivos();
      unsubSolicitacoes();
    };
  }, [idTurma]);

  function formatarTamanho(bytes) {
    if (!bytes) return "--- KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getMensagemErroEnvio(err) {
    if (err?.code === "storage/unauthorized") {
      return "O Firebase Storage bloqueou o envio. Publique as regras de Storage do projeto e tente novamente.";
    }
    if (err?.code === "storage/canceled") return "O envio do arquivo foi cancelado.";
    if (err?.code === "storage/quota-exceeded") return "O limite de armazenamento do Firebase foi atingido.";
    return err?.message || "Não foi possível enviar o arquivo. Tente novamente.";
  }

  // Handler: Professor pede arquivo para a Coordenação
  async function handleEnviarSolicitacao(e) {
    e.preventDefault();
    const nome = novaSolicitacao.nome.trim() || novaSolicitacao.arquivo?.name || "";
    if (!nome || !novaSolicitacao.arquivo) {
      setErroSolicitacao("Selecione um arquivo para enviar à coordenação.");
      return;
    }

    setEnviando(true);
    setErroSolicitacao("");
    try {
      await criarSolicitacaoArquivo(idTurma, { ...novaSolicitacao, nome }, usuarioFormatado);
      setNovaSolicitacao({ nome: "", descricao: "", arquivo: null });
      setModalSolicitarAberto(false);
    } catch (err) {
      console.error("Erro ao submeter pedido:", err);
      setErroSolicitacao(getMensagemErroEnvio(err));
    } finally {
      setEnviando(false);
    }
  }

  // Handler: Coordenador aprova o pedido e anexa as propriedades
  async function handleAprovar(solicitacao) {
    if (!isCoordenador || processandoSolicitacaoId) return;
    const nomeArquivo = solicitacao.nome || solicitacao.arquivoNome || "arquivo";
    const metaArquivo = {
      tipo: solicitacao.arquivoTipo || nomeArquivo.split(".").pop()?.toLowerCase() || "arquivo",
      tamanho: formatarTamanho(solicitacao.arquivoTamanho),
      url: solicitacao.arquivoUrl || "",
      arquivoNome: solicitacao.arquivoNome || nomeArquivo,
      storagePath: solicitacao.arquivoStoragePath || ""
    };

    try {
      setProcessandoSolicitacaoId(solicitacao.id);
      await aprovarEAdicionarArquivo(solicitacao, metaArquivo, usuarioFormatado);
      // Notificação ao professor já disparada dentro de aprovarEAdicionarArquivo (estrutura.js)
    } catch (err) {
      console.error("Erro ao validar aprovação:", err);
    } finally {
      setProcessandoSolicitacaoId("");
    }
  }

  async function handleRecusar(solicitacao) {
    if (!isCoordenador || processandoSolicitacaoId) return;

    const motivo = window.prompt("Motivo da recusa (opcional):", "");
    if (motivo === null) return;

    try {
      setProcessandoSolicitacaoId(solicitacao.id);
      await recusarSolicitacaoArquivo(solicitacao, usuarioFormatado, motivo);
      // Notificação ao professor já disparada dentro de recusarSolicitacaoArquivo (estrutura.js)
    } catch (err) {
      console.error("Erro ao recusar solicitacao:", err);
    } finally {
      setProcessandoSolicitacaoId("");
    }
  }

  function getIconeArquivo(tipo) {
    if (tipo === "pdf") return <FileText size={24} color="#EF4444" />;
    if (["xlsx", "xls", "csv"].includes(tipo)) return <FileSpreadsheet size={24} color="#10B981" />;
    return <File size={24} color="#6B7280" />;
  }

  return (
    <div className="turma-arquivos-pagina" style={{ fontFamily: "'Poppins', sans-serif", background: "var(--branco)", color: "var(--texto)", border: "1px solid var(--borda)", borderRadius: 14, padding: 24 }}>
      {/* Header Interno */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {handleVoltar && (
            <button
              className="btn-voltar"
              onClick={handleVoltar}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px" }}
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          )}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--texto)", margin: 0 }}>{tituloTurma}</h2>
            <p style={{ fontSize: 13, color: "var(--texto-sec)", margin: "2px 0 0 0" }}>Documentos e solicitações da turma</p>
          </div>
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
            <div style={{ border: "2px dashed var(--borda)", borderRadius: 12, padding: "32px 16px", textAlign: "center", color: "var(--texto-sec)" }}>
              <FolderOpen size={32} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum documento disponível nesta pasta.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {arquivos.map((arq) => (
                <div key={arq.id} className="arquivo-turma-item" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "var(--bg)", borderRadius: 10, border: "0.5px solid var(--borda)" }}>
                  {getIconeArquivo(arq.tipo)}
                  <div style={{ flex: 1 }}>
                    {arq.url ? (
                      <a href={arq.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "var(--texto)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {arq.nome} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--texto)" }}>{arq.nome}</div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--texto-sec)" }}>Tamanho: {arq.tamanho} • Por: {arq.enviadoPor}</div>
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
            <p style={{ fontSize: 12, color: "var(--texto-sec)", fontStyle: "italic" }}>Nenhum pedido efetuado até ao momento.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {solicitacoes.map((sol) => (
                <div key={sol.id} className="solicitacao-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--branco)", borderRadius: 8, border: "1px solid var(--borda)" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginRight: 8, background: (sol.status || "pendente") === "pendente" ? "#fef3c7" : "#d1fae5", color: (sol.status || "pendente") === "pendente" ? "#d97706" : "#065f46" }}>
                      {(sol.status || "pendente").toUpperCase()}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--texto)" }}>{sol.nome}</strong>
                    <div style={{ fontSize: 11, color: "var(--texto-sec)", marginTop: 2 }}>Pedido por: {sol.professorNome}</div>
                    {sol.descricao && (
                      <div style={{ fontSize: 11, color: "var(--texto-sec)", marginTop: 2, maxWidth: 520 }}>{sol.descricao}</div>
                    )}
                    {sol.arquivoUrl && (
                      <a href={sol.arquivoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#6F3B9D", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 600 }}>
                        Ver arquivo enviado <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {isCoordenador && (sol.status || "pendente") === "pendente" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleAprovar(sol)}
                        disabled={Boolean(processandoSolicitacaoId)}
                        style={{
                          background: "#10B981", color: "#fff", border: "none", borderRadius: 6,
                          padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: processandoSolicitacaoId ? "wait" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, opacity: processandoSolicitacaoId === sol.id ? 0.7 : 1
                        }}
                      >
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button
                        onClick={() => handleRecusar(sol)}
                        disabled={Boolean(processandoSolicitacaoId)}
                        style={{
                          background: "#ef4444", color: "#fff", border: "none", borderRadius: 6,
                          padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: processandoSolicitacaoId ? "wait" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, opacity: processandoSolicitacaoId === sol.id ? 0.7 : 1
                        }}
                      >
                        <XCircle size={14} /> Recusar
                      </button>
                    </div>
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
            <div className="turma-arquivos-modal" style={{ background: "var(--branco)", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "var(--texto)" }}>Nova Solicitação</h4>
              <form onSubmit={handleEnviarSolicitacao}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--texto-sec)", marginBottom: 6 }}>Nome Exato do Arquivo/Documento</label>
                <input
                  type="text"
                  placeholder="Ex: Ata_Reuniao_Abril.pdf"
                  value={novaSolicitacao.nome}
                  onChange={e => setNovaSolicitacao({ ...novaSolicitacao, nome: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, marginBottom: 16, outline: "none" }}
                />

                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--texto-sec)", marginBottom: 6 }}>Arquivo para análise</label>
                <label style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1.5px dashed #6F3B9D", fontSize: 13, marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#6F3B9D", background: "var(--roxo-claro)" }}>
                  <Upload size={16} />
                  {novaSolicitacao.arquivo ? novaSolicitacao.arquivo.name : "Selecionar arquivo"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*"
                    onChange={e => {
                      const arquivo = e.target.files?.[0] || null;
                      setNovaSolicitacao(prev => ({
                        ...prev,
                        arquivo,
                        nome: prev.nome || arquivo?.name || ""
                      }));
                      setErroSolicitacao("");
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--texto-sec)", marginBottom: 6 }}>Justificação / Observações</label>
                <textarea
                  placeholder="Explique à coordenação o motivo deste documento..."
                  value={novaSolicitacao.descricao}
                  onChange={e => setNovaSolicitacao({ ...novaSolicitacao, descricao: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, minHeight: 70, marginBottom: 20, outline: "none", resize: "none" }}
                />

                {erroSolicitacao && <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>{erroSolicitacao}</p>}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setModalSolicitarAberto(false)} style={{ padding: "8px 16px", background: "var(--roxo-claro)", border: "1px solid var(--borda)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--texto)", cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" disabled={enviando} style={{ padding: "8px 16px", background: "#6F3B9D", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    {enviando ? "A enviar..." : "Enviar Pedido"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}