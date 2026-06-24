import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import TurmaArquivos from './TurmaArquivos'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { buscarPerfil } from '../firebase/estrutura'
import { escutarTurmasPeriodo, adicionarTurmaPeriodo, removerTurmaPeriodo } from '../firebase/estrutura'
import DropdownComPortal from './DropwdownComPortal'
import './secoes.css'
import { criarNotificacaoPorRole } from "../notificacoes/notificacoes"

const MotionDiv = motion.div

// Estrutura base dos períodos (cores e ordem fixas; turmas vêm do Firestore)
const PERIODOS_BASE = [
  {
    nome: 'Período Matutino',
    cor: '#F59E0B',
    corFundo: '#FFFBEB',
  },
  {
    nome: 'Período Vespertino',
    cor: '#8B5CF6',
    corFundo: '#F5F3FF',
  },
  {
    nome: 'Período Noturno',
    cor: '#1E40AF',
    corFundo: '#EFF6FF',
  },
]

const ANOS = ['1°', '2°', '3°']
const PERIODOS_NOMES = PERIODOS_BASE.map(p => p.nome)
const FORM_INICIAL = { ano: '1°', curso: '', periodo: 'Período Matutino', modular: false }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } },
}

// ─── Modal Nova Turma ────────────────────────────────────────────────────────
function ModalNovaTurma({ onClose, onSalvar }) {
  const [form, setForm]           = useState(FORM_INICIAL)
  const [erro, setErro]           = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(null)

  const ANOS_LABELS = ANOS.map(a => `${a} Ano`)

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErro('')
  }

  async function handleSalvar() {
    if (!form.curso.trim()) { setErro('Informe o nome do curso.'); return }
    setSalvando(true)
    const nomeTurma = `${form.ano} ${form.curso.trim()}${form.modular ? ' - Modular' : ''}`
    await onSalvar(nomeTurma, form.periodo)
    setSalvando(false)
    onClose()
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal' onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 className='modal-titulo' style={{ margin: 0 }}>Nova turma</h3>
            <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '4px 0 0' }}>
              Preencha as informações da turma a ser adicionada.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-sec)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DropdownComPortal
            label='Ano'
            opcoes={ANOS_LABELS}
            valor={`${form.ano} Ano`}
            onChange={opt => handleChange('ano', opt.replace(' Ano', ''))}
            id='turma-ano'
            dropdownAberto={dropdownAberto}
            setDropdownAberto={setDropdownAberto}
          />
          <DropdownComPortal
            label='Período'
            opcoes={PERIODOS_NOMES}
            valor={form.periodo}
            onChange={opt => handleChange('periodo', opt)}
            id='turma-periodo'
            dropdownAberto={dropdownAberto}
            setDropdownAberto={setDropdownAberto}
          />
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Nome do Curso</label>
          <input
            className='perfil-input'
            value={form.curso}
            onChange={e => handleChange('curso', e.target.value)}
            placeholder='Ex: Informática para Internet'
            autoFocus
          />
        </div>

        <div
          className='perfil-grupo'
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => handleChange('modular', !form.modular)}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: `2px solid ${form.modular ? 'var(--roxo)' : '#D1D5DB'}`,
            background: form.modular ? 'var(--roxo)' : 'var(--branco)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
          }}>
            {form.modular && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: 'var(--texto)', fontWeight: 500 }}>Turma Modular</span>
        </div>

        {form.curso.trim() && (
          <div style={{
            background: 'var(--roxo-claro)', borderRadius: 8, padding: '9px 12px',
            fontSize: 13, color: 'var(--roxo)', fontWeight: 600, marginBottom: 4,
          }}>
            Prévia: {form.ano} {form.curso.trim()}{form.modular ? ' - Modular' : ''}
          </div>
        )}

        {erro && <p style={{ color: '#c0392b', fontSize: 12, margin: '4px 0' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className='perfil-salvar' onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar turma'}
          </button>
          <button className='btn-cancelar' onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Confirmar Exclusão ────────────────────────────────────────────────
function ModalConfirmar({ nomeTurma, nomePeriodo, corPeriodo, onConfirmar, onCancelar }) {
  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onCancelar} />
      <div className='modal-confirmar'>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <AlertTriangle size={26} color='#ED235C' strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover turma?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover a turma
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: corPeriodo + '15', margin: '0 0 6px',
          animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: corPeriodo, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{nomeTurma}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{nomePeriodo}</div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Todos os dados vinculados a ela deixarão de aparecer nesta listagem.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--borda)', background: 'var(--branco)',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              color: 'var(--texto)', cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--roxo)'; e.currentTarget.style.color = 'var(--roxo)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#555' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: '#ED235C',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              fontWeight: 600, color: '#fff', cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c71b4d'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ED235C'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Sim, remover
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Arquivos({ uid, professor }) {
  const [perfilCarregado, setPerfilCarregado] = useState(null)
  const [modalAberto, setModalAberto]         = useState(false)
  const [confirmarDelete, setConfirmarDelete] = useState(null)
  const [carregando, setCarregando]           = useState(true)

  // Mapa de período → lista de turmas vindas do Firestore
  // { 'Período Matutino': [{ id, nomeTurma }, ...], ... }
  const [turmasPorPeriodo, setTurmasPorPeriodo] = useState({})

  const [turmaSelecionada, setTurmaSelecionada] = useState(null)
  const [nomePeriodoSelecionado, setNomePeriodoSelecionado] = useState(null)

  const perfilAtual = professor
    ? { ...professor, uid: uid || professor.uid || professor.id }
    : perfilCarregado
  const isCoordenador = perfilAtual?.role === 'coordenador'

  // Carrega o perfil quando não vem pelo prop
  useEffect(() => {
    if (professor) return
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const perfil = await buscarPerfil(user.uid)
      setPerfilCarregado(perfil ? { ...perfil, uid: user.uid } : null)
    })
    return () => unsubscribe()
  }, [professor, uid])

  // Escuta o Firestore em tempo real — qualquer mudança do coordenador
  // aparece automaticamente para todos os usuários conectados
  useEffect(() => {
    const unsub = escutarTurmasPeriodo((mapa) => {
      setTurmasPorPeriodo(mapa)
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  // Monta a lista de períodos mesclando a estrutura base (cores) com as turmas do Firestore
  const listaPeriodos = PERIODOS_BASE.map(periodo => ({
    ...periodo,
    turmas: turmasPorPeriodo[periodo.nome] || [],
  }))

  async function handleAdicionarTurma(nomeTurma, nomePeriodo) {
  try {
    await adicionarTurmaPeriodo(
      nomeTurma,
      nomePeriodo,
      auth.currentUser?.uid
    )

    console.log('Turma criada. Criando notificação para professores...')

    try {
      const resultado = await criarNotificacaoPorRole({
        role: 'professor',
        titulo: 'Nova turma criada',
        mensagem: `A turma ${nomeTurma} (${nomePeriodo}) foi adicionada.`,
        tipo: 'turma',
        link: '/arquivos',
        criadoPorUid: auth.currentUser?.uid || uid,
        criadoPorNome:
          perfilAtual?.nome ||
          auth.currentUser?.displayName ||
          'Coordenação',
      })

      console.log('Resultado da criação de notificações:', resultado)
    } catch (erroNotificacao) {
      console.error(
        'Turma criada, mas ocorreu erro ao notificar professores:',
        erroNotificacao
      )
    }
  } catch (err) {
    console.error('Erro ao adicionar turma:', err)
  }
}

  async function executarDelete() {
    if (!confirmarDelete) return
    await removerTurmaPeriodo(confirmarDelete.turmaDocId)
    setConfirmarDelete(null)
  }

  const periodoObjetoAtivo = listaPeriodos.find(p => p.nome === nomePeriodoSelecionado)

  if (turmaSelecionada && periodoObjetoAtivo) {
    return (
      <TurmaArquivos
        turma={turmaSelecionada}
        periodo={periodoObjetoAtivo}
        turmaId={`${nomePeriodoSelecionado} - ${turmaSelecionada}`}
        titulo={turmaSelecionada}
        perfil={perfilAtual}
        uid={uid}
        onVoltar={() => {
          setTurmaSelecionada(null)
          setNomePeriodoSelecionado(null)
        }}
      />
    )
  }

  return (
    <div className='arquivos-container' style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 40px' }}>

      {modalAberto && (
        <ModalNovaTurma
          onClose={() => setModalAberto(false)}
          onSalvar={handleAdicionarTurma}
        />
      )}

      {confirmarDelete && (
        <ModalConfirmar
          nomeTurma={confirmarDelete.nomeTurma}
          nomePeriodo={confirmarDelete.nomePeriodo}
          corPeriodo={confirmarDelete.corPeriodo}
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDelete(null)}
        />
      )}

      {/* Cabeçalho */}
      <MotionDiv
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--texto)', marginBottom: 4 }}>
            Arquivos
          </h1>
          <p style={{ color: 'var(--texto-sec)', fontSize: 14, margin: 0 }}>
            Selecione uma turma para acessar ou solicitar arquivos
          </p>
        </div>

        {isCoordenador && (
          <button
            className='btn-upload'
            style={{ marginTop: 0 }}
            onClick={() => setModalAberto(true)}
          >
            + Nova turma
          </button>
        )}
      </MotionDiv>

      {carregando ? (
        <p style={{ color: 'var(--texto-sec)', fontSize: 14 }}>Carregando turmas...</p>
      ) : (
        listaPeriodos.map((periodo, pi) => (
          <MotionDiv
            key={periodo.nome}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: pi * 0.1 }}
            style={{ marginBottom: 40 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 16, paddingBottom: 10,
              borderBottom: `2px solid ${periodo.cor}22`,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: periodo.cor,
              }}>
                {periodo.nome}
              </span>
              <span style={{
                fontSize: 12, background: periodo.cor + '18',
                color: periodo.cor, borderRadius: 99,
                padding: '2px 10px', fontWeight: 600,
              }}>
                {periodo.turmas.length} turmas
              </span>
            </div>

            {periodo.turmas.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--texto-sec)', fontStyle: 'italic' }}>
                Nenhuma turma neste período.
              </p>
            ) : (
              <MotionDiv
                variants={containerVariants}
                initial='hidden'
                animate='show'
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: 14,
                }}
              >
                {periodo.turmas.map(({ id: turmaDocId, nomeTurma }) => (
                  <TurmaCard
                    key={turmaDocId}
                    turma={nomeTurma}
                    periodo={periodo}
                    isCoordenador={isCoordenador}
                    onExcluir={() => setConfirmarDelete({
                      turmaDocId,
                      nomeTurma,
                      nomePeriodo: periodo.nome,
                      corPeriodo: periodo.cor,
                    })}
                    onClick={() => {
                      setTurmaSelecionada(nomeTurma)
                      setNomePeriodoSelecionado(periodo.nome)
                    }}
                  />
                ))}
              </MotionDiv>
            )}
          </MotionDiv>
        ))
      )}
    </div>
  )
}

// ─── Card de turma ───────────────────────────────────────────────────────────
function TurmaCard({ turma, periodo, onClick, isCoordenador, onExcluir }) {
  const [hover, setHover] = useState(false)

  const match = turma.match(/^(\d°)\s(.+)$/)
  const numero    = match ? match[1] : ''
  const nomeCurso = match ? match[2] : turma

  return (
    <MotionDiv
      variants={cardVariants}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        background: 'var(--branco)', borderRadius: 14,
        padding: '18px 18px 14px', cursor: 'pointer',
        transition: 'all 0.22s ease',
        display: 'flex', flexDirection: 'column', gap: 20,
        position: 'relative',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: periodo.cor, lineHeight: 1 }}>
          {numero}
        </span>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--texto)', margin: 0, flexGrow: 1, paddingRight: isCoordenador ? 24 : 0 }}>
          {nomeCurso}
        </p>

        {isCoordenador && (
          <button
            title="Excluir turma"
            onClick={(e) => {
              e.stopPropagation()
              onExcluir()
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#EF4444',
              padding: 4,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <button
        style={{
          width: '100%', padding: '7px 0', borderRadius: 8, border: 'none',
          background: hover ? periodo.cor : periodo.cor + '15',
          color: hover ? '#fff' : periodo.cor,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s ease', letterSpacing: '0.02em',
        }}
      >
        Acessar arquivos →
      </button>
    </MotionDiv>
  )
}