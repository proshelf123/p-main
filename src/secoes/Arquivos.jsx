import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import TurmaArquivos from './TurmaArquivos'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { buscarPerfil, escutarTurmasPeriodo, removerTurmaPeriodo } from '../firebase/estrutura'
import './secoes.css'

const MotionDiv = motion.div

const PERIODOS_BASE = [
  { nome: 'Período Matutino', cor: '#F59E0B', corFundo: '#FFFBEB' },
  { nome: 'Período Vespertino', cor: '#8B5CF6', corFundo: '#F5F3FF' },
  { nome: 'Período Noturno', cor: '#1E40AF', corFundo: '#EFF6FF' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } },
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
  const [confirmarDelete, setConfirmarDelete] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const [turmasPorPeriodo, setTurmasPorPeriodo] = useState({})
  const [turmaSelecionada, setTurmaSelecionada] = useState(null)
  const [nomePeriodoSelecionado, setNomePeriodoSelecionado] = useState(null)

  const perfilAtual = professor
    ? { ...professor, uid: uid || professor.uid || professor.id }
    : perfilCarregado
  const isCoordenador = perfilAtual?.role === 'coordenador'

  useEffect(() => {
    if (professor) return
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const perfil = await buscarPerfil(user.uid)
      setPerfilCarregado(perfil ? { ...perfil, uid: user.uid } : null)
    })
    return () => unsubscribe()
  }, [professor, uid])

  useEffect(() => {
    const unsub = escutarTurmasPeriodo((mapa) => {
      setTurmasPorPeriodo(mapa)
      setCarregando(false)
    })
    return () => unsub()
  }, [])

  const listaPeriodos = PERIODOS_BASE.map(periodo => ({
    ...periodo,
    turmas: turmasPorPeriodo[periodo.nome] || [],
  }))

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
    <div className='arquivos-container' style={{ minHeight: '50vh', background: 'var(--bg)', padding: '12px 10px' }}>

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
        {/* --- HEADER MINIMALISTA COM LINHA INFERIOR --- */}
        <div
          style={{
            width: "100%", /* <-- ESSA LINHA FORÇA O TRAÇO A IR DE PONTA A PONTA */
            marginBottom: "32px",
            paddingBottom: "24px",
            borderBottom: "1px solid var(--borda)"
          }}
        >
          {/* A linha roxa agora fica isolada aqui, acompanhando apenas a altura do texto */}
          <div
            style={{
              paddingLeft: "15px",
              borderLeft: "3px solid var(--roxo)"
            }}
          >
            <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
              Arquivos
            </h2>
            <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
              Selecione uma turma para acessar ou solicitar arquivos
            </p>
          </div>
        </div>
        {/* --- FIM DO HEADER --- */}
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
              /* INÍCIO DO NOVO AGRUPAMENTO */
              (() => {
                // 1. Separa as turmas pelo ano (1º, 2º, 3º...)
                const turmasAgrupadas = {}
                periodo.turmas.forEach(turmaObj => {
                  const match = turmaObj.nomeTurma.match(/^(\d°)/)
                  const ano = match ? match[1] : 'Outros'

                  if (!turmasAgrupadas[ano]) {
                    turmasAgrupadas[ano] = []
                  }
                  turmasAgrupadas[ano].push(turmaObj)
                })

                // 2. Ordena para o 1º aparecer antes do 2º, e as "Outras" ficarem por último
                const anosOrdenados = Object.keys(turmasAgrupadas).sort((a, b) => {
                  if (a === 'Outros') return 1
                  if (b === 'Outros') return -1
                  return a.localeCompare(b)
                })

                // 3. Renderiza os blocos
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {anosOrdenados.map(ano => (
                      <div key={ano}>
                        {/* Título (Ex: 1º anos:) */}
                        <h3 style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '20px',
                          fontWeight: 700,
                          color: 'var(--texto)',
                          margin: '0 0 16px 0'
                        }}>
                          {ano === 'Outros' ? (
                            <span>Outras turmas:</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '22px', fontWeight: 800, color: periodo.cor, lineHeight: 1 }}>
                                {ano}
                              </span>
                              <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--texto)' }}>
                                anos:
                              </span>
                            </>
                          )}
                        </h3>

                        {/* O Grid idêntico ao original, sem alterar o formato das caixas */}
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
                          {turmasAgrupadas[ano].map(({ id: turmaDocId, nomeTurma }) => (
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
                      </div>
                    ))}
                  </div>
                )
              })()
              /* FIM DO NOVO AGRUPAMENTO */
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
  const numero = match ? match[1] : ''
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: periodo.cor, lineHeight: 1, flexShrink: 0 }}>
          {numero}
        </span>
        <p style={{
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--texto)',
          margin: 0,
          flexGrow: 1,
          paddingRight: isCoordenador ? 24 : 0,
          wordBreak: 'break-word',    /* Força a quebra da palavra se for muito longa */
          overflowWrap: 'anywhere'    /* Garante que o texto fique dentro da caixa */
        }}>
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