// src/coordenador/CadastroProfessores.jsx
//
// Usa Cloud Functions para criar a conta do professor
// sem deslogar o coordenador.

import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, functions, db } from '../firebase'
import './coordenador.css'
import { Trash2, TriangleAlert, CircleCheckBig, AlertTriangle, Eye, EyeOff  } from 'lucide-react'
import { criarNotificacao } from '../notificacoes/notificacoes'

const FORM_INICIAL = { nome: '', email: '', senha: ''}
const FUNCTIONS_HTTP_BASE = 'https://us-central1-proshelf-8ecfd.cloudfunctions.net'

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function mensagemErro(error, fallback) {
  const code = String(error?.code || '')

  if (code.includes('unauthenticated')) return 'Sua sessão expirou. Faça login novamente.'
  if (code.includes('permission-denied')) return 'Apenas coordenadores podem gerenciar professores.'
  if (code.includes('invalid-argument')) return error?.message || fallback
  if (code.includes('not-found')) return 'Professor não encontrado.'
  if (code.includes('already-exists')) return 'Este e-mail já está cadastrado.'
  if (code.includes('internal')) {
    return 'Não foi possível concluir a ação. Verifique se as Cloud Functions foram publicadas e tente novamente.'
  }

  return error?.message || fallback
}

function obterNomeProfessor(professor) {
  return professor?.nome || professor?.email || 'Professor'
}

async function chamarFuncaoHttp(nomeFuncao, dados) {
  const token = await auth.currentUser?.getIdToken()

  if (!token) {
    const error = new Error('Sua sessão expirou. Faça login novamente.')
    error.code = 'functions/unauthenticated'
    throw error
  }

  const response = await fetch(`${FUNCTIONS_HTTP_BASE}/${nomeFuncao}Http`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: dados }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.error) {
    const erroPayload = payload.error || {}
    const error = new Error(erroPayload.message || 'Erro ao chamar Cloud Function.')
    error.code = erroPayload.status
      ? `functions/${String(erroPayload.status).toLowerCase().replaceAll('_', '-')}`
      : `functions/http-${response.status}`
    throw error
  }

  return { data: payload.result }
}

async function chamarFuncaoProfessor(nomeFuncao, dados) {
  try {
    const callable = httpsCallable(functions, nomeFuncao)
    return await callable(dados)
  } catch (error) {
    console.warn(`Callable ${nomeFuncao} falhou. Tentando rota HTTP autenticada:`, error)
    return chamarFuncaoHttp(nomeFuncao, dados)
  }
}

// --- MODAL DE CONFIRMAÇÃO (exclusão) ---
function ModalConfirmarProfessor({ professor, onConfirmar, onCancelar }) {
  const nome = obterNomeProfessor(professor);
  const email = professor?.email || '';

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
          Remover professor?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover o professor:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          background: '#FFF0F3', margin: '0 0 6px', animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ED235C', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ED235C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nome}
            </div>
            <div style={{ fontSize: 11, color: '#ED235C', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Isso apagará a conta de acesso dele permanentemente.
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

// --- MODAL DE PROFESSOR CADASTRADO (sucesso) ---
function ModalProfessorCadastrado({ nome, onFechar }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFechar()
    }, 2500) // O modal fechará passados 2,5 segundos
    return () => clearTimeout(timer)
  }, [onFechar])

  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onFechar} style={{ zIndex: 99999 }} />
      <div className='modal-confirmar' style={{ zIndex: 100000 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#D1FAE5', // Verde bem claro para o fundo do ícone
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <CircleCheckBig size={26} color='#10B981' strokeWidth={2.2} /> {/* Verde esmeralda */}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Professor cadastrado!
        </h3>

        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
          {nome ? `${nome} já` : 'Ele já'} pode fazer login com o e-mail e senha definidos.
        </p>

        <div style={{ display: 'flex' }}>
          <button
            onClick={onFechar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: '#10B981', // Verde principal
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              fontWeight: 600, color: '#fff', cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </>
  )
}

export default function CadastroProfessores() {
  const [professores, setProfessores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [salvando, setSalvando]       = useState(false)
  const [erro, setErro]               = useState('')
  const [animacaoErro, setAnimacaoErro] = useState(0) // dispara a animação a cada novo erro
  const [camposComErro, setCamposComErro] = useState([]) // quais inputs devem tremer/contornar de vermelho
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Estado do modal de sucesso do cadastro
  const [professorCadastrado, setProfessorCadastrado] = useState(null)

  // Estados para o Modal de Exclusão
  const [excluindoId, setExcluindoId] = useState('')
  const [professorParaDeletar, setProfessorParaDeletar] = useState(null)

  const componenteAtivoRef = useRef(true)

  const dispararErro = useCallback((mensagem, campos = []) => {
    setErro(mensagem)
    setCamposComErro(campos)
    setAnimacaoErro((valorAtual) => valorAtual + 1)
  }, [])

  const carregarProfessores = useCallback(async ({ mostrarLoading = true } = {}) => {
    if (mostrarLoading) setLoading(true)

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado.");

      // 1. Busca o perfil do coordenador logado para descobrir o escolaId
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const escolaId = userSnap.data()?.escolaId;

      if (!escolaId) {
        throw new Error("Escola não identificada para este coordenador.");
      }

      // 2. Busca os professores APENAS dessa escola
      const q = query(
        collection(db, 'professores_escola'),
        where('escolaId', '==', escolaId)
      );
      
      const snap = await getDocs(q);
      const lista = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => obterNomeProfessor(a).localeCompare(
          obterNomeProfessor(b),
          'pt-BR',
          { sensitivity: 'base' },
        ))

      if (!componenteAtivoRef.current) return
      setProfessores(lista)
    } catch (error) {
      console.error('Erro ao carregar professores:', error)

      if (!componenteAtivoRef.current) return
      dispararErro(mensagemErro(error, 'Erro ao carregar professores.'))
      setProfessores([])
    } finally {
      if (componenteAtivoRef.current) setLoading(false)
    }
  }, [dispararErro])

  useEffect(() => {
    componenteAtivoRef.current = true
    carregarProfessores()

    return () => {
      componenteAtivoRef.current = false
    }
  }, [carregarProfessores])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((formAtual) => ({ ...formAtual, [name]: value }))
    setErro('')
    setCamposComErro([])
  }


  async function garantirPerfilNoFirestore(uid, dados, escolaId) {
    try {
      await setDoc(doc(db, 'users', uid), {
        nome: dados.nome,
        email: dados.email,
        role: 'professor',
        escolaId: escolaId, // Garante que o perfil tenha a escolaId caso a cloud function não tenha posto
        criadoEm: serverTimestamp(),
      }, { merge: true })
    } catch (err) {
      console.warn('Não foi possível criar perfil no Firestore:', err)
    }
  }

  async function enviarNotificacaoBoasVindas(uid, nome) {
    try {
      const resultado = await criarNotificacao({
        titulo: "Bem-vindo ao ProShelf!",
        mensagem: `Olá ${nome}, sua conta de acesso foi criada com sucesso pelo coordenador.`,
        tipo: "aviso",
        link: "/perfil",
        destinatarioUids: [uid],
        criadoPorNome: "Coordenação"
      })

      if (resultado?.sucesso === false) {
        console.warn("Notificação de boas-vindas não foi criada:", resultado)
      }
    } catch (notifErr) {
      console.error("Erro ao enviar notificação de boas-vindas:", notifErr)
    }
  }

  async function handleSalvar() {
    if (salvando) return

    const dados = {
      nome: form.nome.trim(),
      email: normalizarEmail(form.email),
      senha: form.senha,
    }

    if (!dados.nome || !dados.email || !dados.senha) {
      dispararErro('Preencha todos os campos.', [
        !dados.nome && 'nome',
        !dados.email && 'email',
        !dados.senha && 'senha',
      ].filter(Boolean))
      return
    }
    if (!dados.email.includes('@')) {
      dispararErro('Digite um e-mail válido.', ['email'])
      return
    }
    if (dados.senha.length < 6) {
      dispararErro('A senha deve ter pelo menos 6 caracteres.', ['senha'])
      return
    }

    setSalvando(true)
    setErro('')
    setCamposComErro([])

    try {
      const resultadoId = await chamarFuncaoProfessor('criarProfessor', dados)
      const uidCriado = resultadoId?.data?.uid

      if (!uidCriado) {
        throw new Error('A função criou o professor, mas não retornou o UID.')
      }

      // Pega a escola do usuário atual para garantir que o perfil frontend salve certinho
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const escolaId = userSnap.data()?.escolaId;

      await garantirPerfilNoFirestore(uidCriado, dados, escolaId)
      await enviarNotificacaoBoasVindas(uidCriado, dados.nome)

      if (!componenteAtivoRef.current) return
      setProfessorCadastrado(dados.nome)
      setForm(FORM_INICIAL)

      await carregarProfessores({ mostrarLoading: false })

    } catch (error) {
      console.error('Erro ao cadastrar professor:', error)

      if (componenteAtivoRef.current) {
        dispararErro(mensagemErro(error, 'Erro ao cadastrar professor.'))
      }
    } finally {
      if (componenteAtivoRef.current) setSalvando(false)
    }
  }

  // --- PASSO 1: Abre o modal ---
  function solicitarDelecao(professor) {
    const email = normalizarEmail(professor?.email)
    if (!email) {
      dispararErro('Não foi possível remover: o professor está sem e-mail cadastrado.')
      return
    }
    setProfessorParaDeletar(professor)
  }

  // --- PASSO 2: Executa a exclusão quando o botão do modal for clicado ---
  async function executarDelecao() {
    if (!professorParaDeletar) return

    const email = normalizarEmail(professorParaDeletar?.email)
    const id = professorParaDeletar?.id || email

    setErro('')
    setCamposComErro([])
    setExcluindoId(id)
    setProfessorParaDeletar(null) // Fecha o modal imediatamente para não prender o ecrã
    
    try {
      await chamarFuncaoProfessor('deletarProfessor', { email })
      await carregarProfessores({ mostrarLoading: false })
    } catch (error) {
      console.error('Erro ao remover professor:', error)

      if (componenteAtivoRef.current) {
        dispararErro(mensagemErro(error, 'Erro ao remover professor.'))
      }
    } finally {
      if (componenteAtivoRef.current) setExcluindoId('')
    }
  }

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
            Cadastro de Professores
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Cadastre o professor criando a conta de acesso. O coordenador não é deslogado!
          </p>
        </div>
      </div>
      {/* --- FIM DO HEADER --- */}

      {/* --- FORMULÁRIO E LISTA DE PROFESSORES --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        <div className='perfil-grupo'>
          <label className='perfil-label'>Nome completo do professor</label>
          <input
            key={camposComErro.includes('nome') ? `nome-erro-${animacaoErro}` : 'nome'}
            className={`perfil-input ${camposComErro.includes('nome') ? 'perfil-input-erro' : ''}`}
            name='nome' value={form.nome}
            onChange={handleChange} placeholder='Ex: Maria José da Silva'
          />
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>E-mail de acesso</label>
          <input
            key={camposComErro.includes('email') ? `email-erro-${animacaoErro}` : 'email'}
            className={`perfil-input ${camposComErro.includes('email') ? 'perfil-input-erro' : ''}`}
            type='email' name='email' value={form.email}
            onChange={handleChange} placeholder='professor@email.com'
          />
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Senha temporária</label>
          <div style={{ position: 'relative' }}>
            <input
              key={camposComErro.includes('senha') ? `senha-erro-${animacaoErro}` : 'senha'}
              className={`perfil-input ${camposComErro.includes('senha') ? 'perfil-input-erro' : ''}`}
              type={mostrarSenha ? 'text' : 'password'}
              name='senha' value={form.senha}
              onChange={handleChange}
              placeholder='Mínimo 6 caracteres'
              style={{ paddingRight: 80 }}
            />
<button
                type='button'
                onClick={() => setMostrarSenha(!mostrarSenha)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--texto-sec)', display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--texto-sec)', marginTop: 3 }}>
            O professor pode trocar a senha depois em Configurações
          </span>
        </div>

        {erro && (
          <div key={animacaoErro} className='upload-erro upload-erro-anim'>
            <TriangleAlert size={25}/> {erro}
          </div>
        )}

        <button className='upload-btn' type='button' onClick={handleSalvar} disabled={salvando} style={{ marginTop: '8px' }}>
          {salvando ? 'Cadastrando...' : 'Cadastrar professor'}
        </button>
      </div>

      {/* Lista de professores */}
      <div className='sec-titulo' style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', marginBottom: '12px' }}>
        Professores cadastrados ({professores.length})
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', fontFamily: 'Poppins, sans-serif' }}>
          Carregando...
        </p>
      ) : professores.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', fontFamily: 'Poppins, sans-serif', padding: '16px 0' }}>
          Nenhum professor cadastrado ainda.
        </p>
      ) : (
        professores.map((professor) => {
          const nome = obterNomeProfessor(professor)
          const id = professor.id || professor.email
          const excluindoEste = excluindoId === id

          return (
            <div key={id} className='professor-card' style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg)', marginBottom: 6,
              fontFamily: 'Poppins, sans-serif',
              border: '0.5px solid var(--borda)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#6F3B9D', color: '#fff',
                fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {nome.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto)' }}>{professor.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--texto-sec)' }}>{professor.email}</div>
              </div>
              <button
                className='professor-remover-btn'
                type='button'
                onClick={() => solicitarDelecao(professor)}
                disabled={excluindoEste || salvando}
                title='Remover professor'
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })
      )}

      {/* RENDERIZA O MODAL SE HOUVER UM PROFESSOR SENDO EXCLUÍDO */}
      {professorParaDeletar && (
        <ModalConfirmarProfessor
          professor={professorParaDeletar}
          onConfirmar={executarDelecao}
          onCancelar={() => setProfessorParaDeletar(null)}
        />
      )}

      {/* RENDERIZA O MODAL DE SUCESSO DO CADASTRO */}
      {professorCadastrado && (
        <ModalProfessorCadastrado
          nome={professorCadastrado}
          onFechar={() => setProfessorCadastrado(null)}
        />
      )}

    </div>
  )
}