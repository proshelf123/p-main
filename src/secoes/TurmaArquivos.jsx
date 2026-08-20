// src/components/TurmaArquivos.jsx
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ExternalLink, FileText, FileSpreadsheet, File, FolderOpen,
  Send, CheckCircle, XCircle, Trash2, Upload, AlertTriangle
} from "lucide-react";
import {
  criarSolicitacaoArquivo,
  escutarSolicitacoes,
  escutarArquivosDaTurma,
  aprovarEAdicionarArquivo,
  recusarSolicitacaoArquivo,
  deletarArquivoAprovado
} from "../firebase/estrutura";

// --- MODAL DE CONFIRMAÇÃO DE DELEÇÃO DE ARQUIVO ---
function ModalConfirmarArquivo({ arquivo, onConfirmar, onCancelar }) {
  return (
    <>
      <div className="modal-confirmar-overlay" onClick={onCancelar} style={{ zIndex: 99999 }} />
      <div className="modal-confirmar" style={{ zIndex: 100000 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <AlertTriangle size={26} color="#ED235C" strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover arquivo?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover o documento desta turma:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          background: '#FFF0F3', margin: '0 0 6px', animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ED235C', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ED235C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {arquivo?.nome}
            </div>
            <div style={{ fontSize: 11, color: '#ED235C', opacity: 0.8 }}>
              Tamanho: {arquivo?.tamanho}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Esta ação não poderá ser desfeita.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--borda)', background: 'var(--branco)',
              fontSize: 13, fontFamily: "'Poppins', sans-serif", color: 'var(--texto)', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--roxo)'; e.currentTarget.style.color = 'var(--roxo)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--borda)'; e.currentTarget.style.color = 'var(--texto-sec)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ED235C',
              fontSize: 13, fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c71b4d'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ED235C'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Sim, remover
          </button>
        </div>
      </div>
    </>
  );
}

export default function TurmaArquivos({ turmaId: turmaIdProp, titulo: tituloProp, perfil, uid, onClose, onVoltar, turma, periodo }) {
  const idTurma = turmaIdProp || [periodo?.nome, turma].filter(Boolean).join(" - ");
  const tituloTurma = tituloProp || turma || "Arquivos da turma";
  const handleVoltar = onVoltar || onClose;
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

  // ESTADO PARA O ARQUIVO QUE SERÁ DELETADO
  const [arquivoParaDeletar, setArquivoParaDeletar] = useState(null);

  useEffect(() => {
    if (!idTurma) return;

    const unsubArquivos = escutarArquivosDaTurma(uid, idTurma, (dados) => setArquivos(dados));
    const unsubSolicitacoes = escutarSolicitacoes(uid, idTurma, (dados) => setSolicitacoes(dados));

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
    if (err?.code === "storage/unauthorized") return "O Firebase Storage bloqueou o envio. Publique as regras de Storage.";
    if (err?.code === "storage/canceled") return "O envio do arquivo foi cancelado.";
    if (err?.code === "storage/quota-exceeded") return "O limite de armazenamento do Firebase foi atingido.";
    return err?.message || "Não foi possível enviar o arquivo. Tente novamente.";
  }

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
    } catch (err) {
      console.error("Erro ao recusar solicitacao:", err);
    } finally {
      setProcessandoSolicitacaoId("");
    }
  }

  // FUNÇÃO QUE EXECUTA A DELEÇÃO APÓS A CONFIRMAÇÃO
  async function handleConfirmarDeleteArquivo() {
    if (!arquivoParaDeletar) return;
    try {
      await deletarArquivoAprovado(arquivoParaDeletar.id);
    } catch (err) {
      console.error("Erro ao deletar arquivo:", err);
    } finally {
      setArquivoParaDeletar(null);
    }
  }

  function getIconeArquivo(tipo) {
    if (tipo === "pdf") return <FileText size={24} color="#EF4444" />;
    if (["xlsx", "xls", "csv"].includes(tipo)) return <FileSpreadsheet size={24} color="#10B981" />;
    return <File size={24} color="#6B7280" />;
  }

  return (
    <div className="turma-arquivos-pagina" style={{ fontFamily: "'Poppins', sans-serif", background: "var(--branco)", color: "var(--texto)", border: "1px solid var(--borda)", borderRadius: 14, padding: 24, boxSizing: "border-box", overflow: "hidden", width: "100%", maxWidth: "100%" }}>

      {/* 🛡️ BLINDAGEM MÁXIMA CSS: Isola todos os problemas de Grid e regras do secoes.css */}
      <style>{`
        .turma-arquivos-pagina * {
          box-sizing: border-box;
        }
        .grid-wrapper {
          min-width: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
        }
        .card-documento-item, .solicitacao-item {
          word-break: break-word;
          overflow-wrap: anywhere;
          min-width: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
        }
        /* Limita nomes gigantes de arquivos a 2 linhas com "..." no final */
        .card-documento-item .nome-arquivo {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal;
        }
        .card-documento-item .btn-ver-arquivo {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0 !important;
        }
        /* Blinda a lixeira contra a regra "button:last-child { width: 100% }" do secoes.css */
        .turma-arquivos-pagina button.btn-lixeira {
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          max-width: 42px !important;
          flex: 0 0 42px !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: static !important;
        }
        :root.dark-mode .card-documento-item {
          background: #12151c !important;
          border-color: var(--borda) !important;
        }
      `}</style>

      {/* Header Interno */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, width: "100%", minWidth: 0 }}>

        {/* Bloco de Arquivos Disponíveis */}
        <div className="grid-wrapper">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Arquivos da Turma ({arquivos.length})
          </h3>
          {arquivos.length === 0 ? (
            <div style={{ border: "2px dashed var(--borda)", borderRadius: 12, padding: "32px 16px", textAlign: "center", color: "var(--texto-sec)" }}>
              <FolderOpen size={32} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum documento disponível nesta pasta.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, width: "100%" }}>
              {arquivos.map((arq) => (
                <div key={arq.id} className="card-documento-item" style={{ display: "flex", flexDirection: "column", padding: 16, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--borda)" }}>

                  {/* --- Cabeçalho do arquivo --- */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
                    <div style={{ flexShrink: 0 }}>
                      {getIconeArquivo(arq.tipo)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nome-arquivo" style={{ fontSize: 14, fontWeight: 600, color: "var(--texto)" }}>{arq.nome}</div>
                      <div style={{ fontSize: 12, color: "var(--texto-sec)", marginTop: 4 }}>Tamanho: {arq.tamanho} • Por: {arq.enviadoPor}</div>
                    </div>
                  </div>

                  {/* --- Área de Ações do Arquivo --- */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, width: '100%' }}>
                    {arq.url ? (
                      <a
                        href={arq.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ver-arquivo"
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          background: '#6F3B9D',
                          color: '#fff',
                          textAlign: 'center',
                          borderRadius: 8,
                          fontWeight: 600,
                          fontSize: 13,
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        Ver arquivo
                      </a>
                    ) : (
                      <div className="btn-ver-arquivo" style={{ flex: 1, padding: '10px 0', background: '#e5e7eb', color: '#9ca3af', textAlign: 'center', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                        Arquivo indisponível
                      </div>
                    )}

                    {isCoordenador && (
                      <button
                        onClick={() => setArquivoParaDeletar(arq)} // ABRE O NOVO MODAL
                        className="btn-lixeira"
                        style={{
                          background: '#FFF0F3',
                          border: '1px solid #ffccc7',
                          color: '#EF4444',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title="Deletar arquivo"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco de Fluxo de Solicitações */}
        <div className="grid-wrapper">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Fila de Pedidos à Coordenação
          </h3>
          {solicitacoes.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--texto-sec)", fontStyle: "italic" }}>Nenhum pedido efetuado até ao momento.</p>
          ) : (
            <div style={{ display: "grid", gap: 8, width: "100%" }}>
              {solicitacoes.map((sol) => (
                <div key={sol.id} className="solicitacao-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--branco)", borderRadius: 8, border: "1px solid var(--borda)" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginRight: 8, background: (sol.status || "pendente") === "pendente" ? "#fef3c7" : "#d1fae5", color: (sol.status || "pendente") === "pendente" ? "#d97706" : "#065f46" }}>
                      {(sol.status || "pendente").toUpperCase()}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--texto)" }}>{sol.nome}</strong>
                    <div style={{ fontSize: 11, color: "var(--texto-sec)", marginTop: 2 }}>Pedido por: {sol.professorNome}</div>
                    {sol.descricao && (
                      <div style={{ fontSize: 11, color: "var(--texto-sec)", marginTop: 2, maxWidth: "100%" }}>{sol.descricao}</div>
                    )}
                    {sol.arquivoUrl && (
                      <a href={sol.arquivoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#6F3B9D", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 600 }}>
                        Ver arquivo enviado <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {isCoordenador && (sol.status || "pendente") === "pendente" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
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
            <div className="turma-arquivos-modal" style={{ background: "var(--branco)", padding: 24, borderRadius: 16, width: "calc(100% - 32px)", maxWidth: 400, maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>              <h4 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "var(--texto)" }}>Nova Solicitação</h4>
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
                  <Upload size={16} flexShrink={0} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {novaSolicitacao.arquivo ? novaSolicitacao.arquivo.name : "Selecionar arquivo"}
                  </span>
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

      {/* RENDERIZA O MODAL SE HOUVER UM ARQUIVO SENDO EXCLUÍDO */}
      {arquivoParaDeletar && (
        <ModalConfirmarArquivo
          arquivo={arquivoParaDeletar}
          onConfirmar={handleConfirmarDeleteArquivo}
          onCancelar={() => setArquivoParaDeletar(null)}
        />
      )}

    </div>
  );
}