import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, Pencil, AlertTriangle, Check, X as XIcon, TriangleAlert } from "lucide-react";
import {
  escutarTurmasPeriodo,
  buscarAlunos,
  criarAluno,
  atualizarAluno,
  deletarAluno,
  getEscolaId,
} from "../firebase/estrutura";
import DropdownComPortal from "../secoes/DropwdownComPortal";
import { db } from "../firebase";
import { writeBatch, doc } from "firebase/firestore";

// --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ---
function ModalConfirmarAluno({ aluno, onConfirmar, onCancelar }) {
  if (!aluno) return null;

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
          Remover aluno?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover o aluno:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          background: '#FFF0F3', margin: '0 0 6px', animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ED235C', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ED235C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {aluno.nome}
            </div>
            <div style={{ fontSize: 11, color: '#ED235C', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {aluno.numero ? `Número: ${aluno.numero}` : 'Sem número'}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Isso apagará o aluno de TODAS as disciplinas desta sala.
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

export default function AlunosTurmas({ uid }) {
  const [salas, setSalas] = useState([]);
  const [salaSel, setSalaSel] = useState("");
  const [alunos, setAlunos] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(null);
  const [erro, setErro] = useState("");
  const [animacaoErro, setAnimacaoErro] = useState(0); // dispara a animação da caixa de erro a cada novo erro
  const [campoComErro, setCampoComErro] = useState(""); // 'novo' | 'edit' | ''

  // Estados para Adição (Formulário do topo)
  const [nomeNovo, setNomeNovo] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  
  // Estados para Edição Inline (Formulário na lista)
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Estado para o Modal de Exclusão
  const [alunoParaDeletar, setAlunoParaDeletar] = useState(null);

  const dispararErro = useCallback((mensagem, campo = "") => {
    setErro(mensagem);
    setCampoComErro(campo);
    setAnimacaoErro((valorAtual) => valorAtual + 1);
  }, []);

  // Reatribui números baseados na ordem alfabética dos nomes
  const reatribuirNumeros = useCallback(async (alunosAtuais, nomeSala) => {
    if (!alunosAtuais || alunosAtuais.length === 0) return;
    const escolaId = await getEscolaId(uid);
    const batch = writeBatch(db);
    
    const ordenados = [...alunosAtuais].sort((a, b) => 
      (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
    );
    
    ordenados.forEach((aluno, index) => {
      const novoNumero = String(index + 1);
      if (aluno.numero !== novoNumero) {
        const ref = doc(db, "salas", escolaId, "lista", nomeSala, "alunos", aluno.id);
        batch.update(ref, { numero: novoNumero });
      }
    });
    
    await batch.commit();
  }, [uid]);

  // Carrega alunos e reatribui números automaticamente
  const carregarAlunos = useCallback(async () => {
    setCarregandoAlunos(true);
    setErro("");
    setCampoComErro("");
    cancelarEdicao();
    try {
      const lista = await buscarAlunos(uid, salaSel);
      setAlunos(lista);
      if (lista.length > 0) {
        await reatribuirNumeros(lista, salaSel);
        // Recarrega após reatribuição para refletir os números atualizados
        const atualizados = await buscarAlunos(uid, salaSel);
        setAlunos(atualizados);
      }
    } catch {
      dispararErro("Não foi possível carregar os alunos desta sala.");
    } finally {
      setCarregandoAlunos(false);
    }
  }, [uid, salaSel, reatribuirNumeros, dispararErro]);

  // 1. Carrega as pastas (salas) únicas da escola
  useEffect(() => {
    setLoading(true);
    const unsub = escutarTurmasPeriodo(uid, (mapa) => {
      const todasAsSalas = new Set();
      Object.values(mapa).forEach(lista => {
        lista.forEach(item => todasAsSalas.add(item.nomeTurma));
      });
      const arraySalas = Array.from(todasAsSalas).sort();
      setSalas(arraySalas);
      if (arraySalas.length > 0 && !salaSel) {
        setSalaSel(arraySalas[0]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // 2. Carrega os alunos sempre que a sala selecionada mudar
  useEffect(() => { 
    if (salaSel) carregarAlunos(); 
  }, [salaSel, carregarAlunos]);

  // --- FUNÇÕES DE CRIAÇÃO ---
  async function handleAdicionarAluno() {
    if (!nomeNovo.trim()) { dispararErro("Informe o nome do aluno.", "novo"); return; }
    setSalvandoNovo(true);
    setErro("");
    setCampoComErro("");
    try {
      await criarAluno(uid, salaSel, { nome: nomeNovo.trim(), numero: "" });
      setNomeNovo("");
      await carregarAlunos();
    } catch {
      dispararErro("Erro ao adicionar aluno.");
    } finally {
      setSalvandoNovo(false);
    }
  }

  function handleNomeNovoChange(valor) {
    setNomeNovo(valor);
    setErro("");
    setCampoComErro("");
  }

  // --- FUNÇÕES DE EDIÇÃO INLINE ---
  function iniciarEdicao(aluno) {
    setEditandoId(aluno.id);
    setNomeEdit(aluno.nome || "");
    setErro("");
    setCampoComErro("");
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNomeEdit("");
  }

  function handleNomeEditChange(valor) {
    setNomeEdit(valor);
    setErro("");
    setCampoComErro("");
  }

  async function handleSalvarEdicao(alunoId) {
    if (!nomeEdit.trim()) { dispararErro("O nome do aluno não pode ficar vazio.", "edit"); return; }
    setSalvandoEdit(true);
    setErro("");
    setCampoComErro("");
    try {
      await atualizarAluno(uid, salaSel, alunoId, { nome: nomeEdit.trim() });
      cancelarEdicao();
      await carregarAlunos();
    } catch {
      dispararErro("Erro ao atualizar aluno.");
    } finally {
      setSalvandoEdit(false);
    }
  }

  // --- FUNÇÕES DE EXCLUSÃO ---
  function solicitarDelecao(aluno) {
    setAlunoParaDeletar(aluno);
  }

  async function executarDelecao() {
    if (!alunoParaDeletar) return;
    const id = alunoParaDeletar.id;
    setErro("");
    setCampoComErro("");
    setAlunoParaDeletar(null); // Fecha o modal imediatamente
    try {
      await deletarAluno(uid, salaSel, id);
      setAlunos((prev) => prev.filter((a) => a.id !== id));
      // Reatribui números após exclusão
      const atualizados = await buscarAlunos(uid, salaSel);
      await reatribuirNumeros(atualizados, salaSel);
      const final = await buscarAlunos(uid, salaSel);
      setAlunos(final);
    } catch {
      dispararErro("Erro ao remover aluno.");
    }
  }

  if (loading) return <p className="secao-vazia">Carregando...</p>;
  if (salas.length === 0) return <p className="secao-vazia">Nenhuma pasta/sala criada ainda.</p>;

  return (
<div>
      {/* --- HEADER MINIMALISTA COM LINHA INFERIOR --- */}
      <div 
        style={{ 
          width: "100%",
          marginBottom: "32px", 
          paddingBottom: "24px", 
          borderBottom: "1px solid var(--borda)" 
        }}
      >
        <div 
          style={{ 
            paddingLeft: "15px",
            borderLeft: "3px solid var(--roxo)" 
          }}
        >
          <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-block' }}>Coordenador</span>
          <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
            Cadastro de Alunos
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Cadastre seus alunos para que os professores possam adicionar notas e registrar a presença.
          </p>
        </div>
      </div>
      {/* --- FIM DO HEADER --- */}

      <div style={{ maxWidth: 320, marginBottom: 20 }}>
        <DropdownComPortal
          id="sala-alunos"
          label="Pasta/Sala"
          opcoes={salas.map((s) => ({ valor: s, label: s }))}
          valor={salaSel}
          onChange={(novaSala) => { setSalaSel(novaSala); }}
          dropdownAberto={dropdownAberto}
          setDropdownAberto={setDropdownAberto}
        />
      </div>

      {/* FORMULÁRIO DE ADIÇÃO (Topo) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="perfil-grupo" style={{ flex: "1 1 200px" }}>
          <label className="perfil-label">Nome</label>
          <input
            key={campoComErro === "novo" ? `nome-novo-erro-${animacaoErro}` : "nome-novo"}
            className={`perfil-input ${campoComErro === "novo" ? "perfil-input-erro" : ""}`}
            value={nomeNovo}
            onChange={(e) => handleNomeNovoChange(e.target.value)}
            placeholder="Nome do aluno"
          />
        </div>
      </div>

      {erro && (
        <div key={animacaoErro} className="upload-erro upload-erro-anim" style={{ margin: "0 0 12px" }}>
          <TriangleAlert size={16} /> {erro}
        </div>
      )}

      <button className="perfil-salvar" style={{ maxWidth: 220, marginBottom: 24 }} onClick={handleAdicionarAluno} disabled={salvandoNovo}>
        <Plus size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
        {salvandoNovo ? "Adicionando..." : "Adicionar aluno"}
      </button>

      {/* LISTA DE ALUNOS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {carregandoAlunos ? (
          <p className="secao-vazia">Carregando alunos...</p>
        ) : alunos.length === 0 ? (
          <p className="secao-vazia">Nenhum aluno cadastrado nesta sala ainda.</p>
        ) : (
          alunos.map((a) => {
            const estaEditando = editandoId === a.id;

            // RENDERIZAÇÃO INLINE: MODO EDIÇÃO
            if (estaEditando) {
              return (
                <div key={a.id} className="arquivo-normal" style={{ padding: "8px 12px", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ width: 60, color: "var(--texto-sec)", fontSize: 12, display: "flex", alignItems: "center", paddingTop: "6px" }}>
                    Nº {a.numero || "—"}
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <input
                      key={campoComErro === "edit" ? `nome-edit-erro-${animacaoErro}` : "nome-edit"}
                      className={`perfil-input ${campoComErro === "edit" ? "perfil-input-erro" : ""}`}
                      style={{ padding: "6px 8px" }}
                      value={nomeEdit}
                      onChange={(e) => handleNomeEditChange(e.target.value)}
                      placeholder="Nome do aluno"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="arquivo-acao" style={{ color: "#047857", opacity: salvandoEdit ? 0.5 : 1 }} onClick={() => handleSalvarEdicao(a.id)} disabled={salvandoEdit} title="Salvar">
                      <Check size={18} />
                    </button>
                    <button className="arquivo-acao" style={{ color: "#ED235C", opacity: salvandoEdit ? 0.5 : 1 }} onClick={cancelarEdicao} disabled={salvandoEdit} title="Cancelar">
                      <XIcon size={18} />
                    </button>
                  </div>
                </div>
              );
            }

            // RENDERIZAÇÃO NORMAL: MODO VISUALIZAÇÃO
            return (
              <div key={a.id} className="arquivo-normal" style={{ justifyContent: "space-between" }}>
                <span className="arquivo-nome">
                  {a.numero ? `${a.numero} · ` : ""}{a.nome}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="arquivo-acao" onClick={() => iniciarEdicao(a)} title="Editar"><Pencil size={15} /></button>
                  <button className="arquivo-acao" onClick={() => solicitarDelecao(a)} title="Remover"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RENDERIZA O MODAL SE HOUVER UM ALUNO SENDO EXCLUÍDO */}
      {alunoParaDeletar && (
        <ModalConfirmarAluno
          aluno={alunoParaDeletar}
          onConfirmar={executarDelecao}
          onCancelar={() => setAlunoParaDeletar(null)}
        />
      )}
    </div>
  );
}