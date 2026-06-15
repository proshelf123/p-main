import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
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

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 className='modal-titulo' style={{ margin: 0 }}>Nova turma</h3>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
              Preencha as informações da turma a ser adicionada.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Ano + Período lado a lado */}
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

        {/* Nome do curso */}
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

        {/* Modular */}
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

        {/* Prévia */}
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

// ─── Componente principal ────────────────────────────────────────────────────
export default function Arquivos() {
  const [isCoordenador, setIsCoordenador] = useState(false)
  const [turmaSelecionada, setTurmaSelecionada]   = useState(null)
  const [periodoSelecionado, setPeriodoSelecionado] = useState(null)
  const [modalAberto, setModalAberto]               = useState(false)

  // Inicializa o estado buscando do localStorage se existir, caso contrário usa a constante estática
  const [listaPeriodos, setListaPeriodos] = useState(() => {
    const dadosSalvos = localStorage.getItem('listaPeriodos')
    return dadosSalvos ? JSON.parse(dadosSalvos) : periodos
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const perfil = await buscarPerfil(user.uid)
      setIsCoordenador(perfil?.role === 'coordenador')
    })
    return () => unsubscribe()
  }, [])

  // Efeito para persistir as alterações na lista de períodos sempre que ela mudar
  useEffect(() => {
    localStorage.setItem('listaPeriodos', JSON.stringify(listaPeriodos))
  }, [listaPeriodos])

  function handleAdicionarTurma(nomeTurma, nomePeriodo) {
    setListaPeriodos(prev =>
      prev.map(p =>
        p.nome === nomePeriodo
          ? { ...p, turmas: [...p.turmas, nomeTurma] }
          : p
      )
    )
  }

  function handleExcluirTurma(nomeTurma, nomePeriodo) {
    const confirmar = window.confirm(`Deseja realmente excluir a turma "${nomeTurma}"?`)
    if (!confirmar) return

    setListaPeriodos(prev =>
      prev.map(p =>
        p.nome === nomePeriodo
          ? { ...p, turmas: p.turmas.filter(t => t !== nomeTurma) }
          : p
      )
    )
  }

  if (turmaSelecionada) {
    return (
      <TurmaArquivos
        turma={turmaSelecionada}
        periodo={periodoSelecionado}
        onVoltar={() => {
          setTurmaSelecionada(null)
          setPeriodoSelecionado(null)
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

        {/* Botão visível apenas para coordenador */}
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
          {/* Cabeçalho do período */}
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
                onExcluir={() => handleExcluirTurma(turma, periodo.nome)}
                onClick={() => {
                  setTurmaSelecionada(turma)
                  setPeriodoSelecionado(periodo)
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

        {/* Botão de Excluir visível apenas para coordenadores */}
        {isCoordenador && (
          <button
            title="Excluir turma"
            onClick={(e) => {
              e.stopPropagation() // Impede que o clique abra a rota/seção da turma
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
            <Trash2 size={16} />
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