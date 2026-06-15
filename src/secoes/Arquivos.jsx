import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import TurmaArquivos from './TurmaArquivos'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { buscarPerfil } from '../firebase/estrutura'
import DropdownComPortal from './DropwdownComPortal'
import './secoes.css'

const periodos = [
  {
    nome: 'Período Matutino',
    cor: '#F59E0B',
    corFundo: '#FFFBEB',
    turmas: [
      '2° Informática para Internet',
      '3° Informática para Internet',
      '1° Desenvolvimento de Sistemas',
      '1° Marketing',
      '2° Marketing',
      '3° Marketing',
      '1° Recursos Humanos',
      '2° Recursos Humanos',
      '3° Recursos Humanos',
      '1° Eletrônica',
      '2° Eletrônica',
      '3° Eletrônica',
    ],
  },
  {
    nome: 'Período Vespertino',
    cor: '#8B5CF6',
    corFundo: '#F5F3FF',
    turmas: [
      '1° Programação de Jogos Digitais',
      '2° Programação de Jogos Digitais',
      '3° Programação de Jogos Digitais',
      '1° Administração',
      '2° Administração',
      '3° Administração',
      '1° Farmácia',
      '2° Farmácia',
      '3° Farmácia',
      '1° Biotecnologia - Modular',
      '2° Biotecnologia - Modular',
      '3° Biotecnologia - Modular',
    ],
  },
  {
    nome: 'Período Noturno',
    cor: '#1E40AF',
    corFundo: '#EFF6FF',
    turmas: [
      '1° Eletroeletrônica',
      '2° Eletroeletrônica',
      '3° Eletroeletrônica',
      '2° Desenvolvimento de Sistemas',
      '3° Desenvolvimento de Sistemas',
      '1° Informática para Internet',
      '1° Administração',
      '2° Administração',
      '3° Administração',
      '1° Marketing - Modular',
      '2° Marketing - Modular',
      '3° Marketing - Modular',
      '1° Farmácia - Modular',
      '2° Farmácia - Modular',
      '3° Farmácia - Modular',
    ],
  },
]

const ANOS = ['1°', '2°', '3°']
const PERIODOS_NOMES = periodos.map(p => p.nome)
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
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
              Preencha as informações da turma a ser adicionada.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
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
            background: form.modular ? 'var(--roxo)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
          }}>
            {form.modular && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: 'var(--texto)', fontWeight: 500 }}>Turma Modular</span>
        </div>

        {form.curso.trim() && (
          <div style={{
            background: '#F5F3FF', borderRadius: 8, padding: '9px 12px',
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

// ─── Modal Confirmar Exclusão (Seu Estilo Customizado) ───────────────────────
function ModalConfirmar({ nomeTurma, nomePeriodo, corPeriodo, onConfirmar, onCancelar }) {
  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onCancelar} />
      <div className='modal-confirmar'>
        {/* Ícone Animado */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <AlertTriangle size={26} color='#ED235C' strokeWidth={2.2} />
        </div>

        {/* Texto */}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', textAlign: 'center' }}>
          Remover turma?
        </h3>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover a turma
        </p>

        {/* Card Dinâmico da Turma */}
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

        <p style={{ fontSize: 12, color: '#999', margin: '0 0 20px', textAlign: 'center' }}>
          Todos os dados vinculados a ela deixarão de aparecer nesta listagem.
        </p>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid #e0e0e0', background: '#fff',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              color: '#555', cursor: 'pointer',
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
export default function Arquivos() {
  const [isCoordenador, setIsCoordenador] = useState(false)
  const [modalAberto, setModalAberto]               = useState(false)
  const [confirmarDelete, setConfirmarDelete]       = useState(null) // { nomeTurma, nomePeriodo, corPeriodo }

  // Inicializa e sincroniza a listagem com o localStorage
  const [listaPeriodos, setListaPeriodos] = useState(() => {
    const dadosSalvos = localStorage.getItem('listaPeriodos')
    return dadosSalvos ? JSON.parse(dadosSalvos) : periodos
  })

  // Inicializa seleções com localStorage para persistência pós-refresh
  const [turmaSelecionada, setTurmaSelecionada] = useState(() => {
    return localStorage.getItem('turmaSelecionada') || null
  })
  const [nomePeriodoSelecionado, setNomePeriodoSelecionado] = useState(() => {
    return localStorage.getItem('nomePeriodoSelecionado') || null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const perfil = await buscarPerfil(user.uid)
      setIsCoordenador(perfil?.role === 'coordenador')
    })
    return () => unsubscribe()
  }, [])

  // Efeitos colaterais de persistência (localStorage)
  useEffect(() => {
    localStorage.setItem('listaPeriodos', JSON.stringify(listaPeriodos))
  }, [listaPeriodos])

  useEffect(() => {
    if (turmaSelecionada) {
      localStorage.setItem('turmaSelecionada', turmaSelecionada)
    } else {
      localStorage.removeItem('turmaSelecionada')
    }
  }, [turmaSelecionada])

  useEffect(() => {
    if (nomePeriodoSelecionado) {
      localStorage.setItem('nomePeriodoSelecionado', nomePeriodoSelecionado)
    } else {
      localStorage.removeItem('nomePeriodoSelecionado')
    }
  }, [nomePeriodoSelecionado])

  function handleAdicionarTurma(nomeTurma, nomePeriodo) {
    setListaPeriodos(prev =>
      prev.map(p =>
        p.nome === nomePeriodo
          ? { ...p, turmas: [...p.turmas, nomeTurma] }
          : p
      )
    )
  }

  function executarDelete() {
    if (!confirmarDelete) return
    setListaPeriodos(prev =>
      prev.map(p =>
        p.nome === confirmarDelete.nomePeriodo
          ? { ...p, turmas: p.turmas.filter(t => t !== confirmarDelete.nomeTurma) }
          : p
      )
    )
    setConfirmarDelete(null)
  }

  const periodoObjetoAtivo = listaPeriodos.find(p => p.nome === nomePeriodoSelecionado)

  if (turmaSelecionada && periodoObjetoAtivo) {
    return (
      <TurmaArquivos
        turma={turmaSelecionada}
        periodo={periodoObjetoAtivo}
        onVoltar={() => {
          setTurmaSelecionada(null)
          setNomePeriodoSelecionado(null)
        }}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', padding: '32px 40px' }}>

      {/* Modal Nova Turma */}
      {modalAberto && (
        <ModalNovaTurma
          onClose={() => setModalAberto(false)}
          onSalvar={handleAdicionarTurma}
        />
      )}

      {/* Modal Confirmar Exclusão Customizado */}
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
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
            Arquivos
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
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
      </motion.div>

      {/* Períodos */}
      {listaPeriodos.map((periodo, pi) => (
        <motion.div
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

          {/* Grid de cards */}
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='show'
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 14,
            }}
          >
            {periodo.turmas.map(turma => (
              <TurmaCard
                key={turma}
                turma={turma}
                periodo={periodo}
                isCoordenador={isCoordenador}
                onExcluir={() => setConfirmarDelete({ nomeTurma: turma, nomePeriodo: periodo.nome, corPeriodo: periodo.cor })}
                onClick={() => {
                  setTurmaSelecionada(turma)
                  setNomePeriodoSelecionado(periodo.nome)
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      ))}
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
    <motion.div
      variants={cardVariants}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 14,
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
        <p style={{ fontSize: 17, fontWeight: 600, color: '#1A1A2E', margin: 0, flexGrow: 1, paddingRight: isCoordenador ? 24 : 0 }}>
          {nomeCurso}
        </p>

        {isCoordenador && (
          <button
            title="Excluir turma"
            onClick={(e) => {
              e.stopPropagation() // Impede a abertura acidental da tela de arquivos ao clicar em apagar
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
    </motion.div>
  )
}