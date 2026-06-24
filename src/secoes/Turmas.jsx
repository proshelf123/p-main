import { useState, useEffect } from 'react'
import { buscarTurmas, criarTurma, deletarTurma,
  buscarRegistros, criarRegistroAula, deletarRegistro, buscarProfessores
} from '../firebase/estrutura'
import './secoes.css'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import CustomDatePicker from './dropdown-calendario'
import { criarNotificacao } from "../notificacoes/notificacoes";

const COR_DISCIPLINA = {
  'Matemática': { ativo: '#FF0000', bg: '#fff0f0', cor: '#b30000' },
  'Física':     { ativo: '#188AF5', bg: '#e3f0fe', cor: '#0a5eaa' },
  'Química':    { ativo: '#FFE100', bg: '#fffbe0 ', cor: '#8a7200' },
  'Biologia':    { ativo: '#0BDB23', bg: '#e6fbed ', cor: '#057d19' },
  'História':    { ativo: '#AA6803', bg: '#f5ece0 ', cor: '#7a4b02' },
  'Geografia':    { ativo: '#006500', bg: '#e0f0e0 ', cor: '#004500' },
  'Português':    { ativo: '#00D5ED', bg: '#e0fafd ', cor: '#007f8f' },
  'Artes':    { ativo: '#FF00AA', bg: '#ffe8f6 ', cor: '#a80070' },
  'Filosofia':    { ativo: '#760507', bg: '#f2e5e6 ', cor: '#520305' },
  'Inglês':    { ativo: '#2F00FF', bg: '#eaebff ', cor: '#1e00b3' },
  'Educação Física':    { ativo: '#FF6A00', bg: '#fff0e5 ', cor: '#b34900' },
}

const COR_TIPO = {
  teorica:   { bg: '#0BDB23', cor: '#fff', label: 'Aula teórica'  },
  pratica:   { bg: '#ED235C', cor: '#fff', label: 'Aula Prática'  },
  atividade: { bg: '#FFBB00', cor: '#fff', label: 'Atividades'    },
  avaliacao: { bg: '#188AF5', cor: '#fff', label: 'Avaliações'    },
}

const PERIODOS = ['Matutino', 'Vespertino', 'Noturno']

const FORM_TURMA_INICIAL    = { nome: '', disciplina: '', periodo: 'Matutino', professor: '', professorId: '' }
const FORM_REGISTRO_INICIAL = { data: '', conteudo: '', descricao: '', informacoes: '', tipo: 'teorica' }

function coresDe(disciplina) {
  return COR_DISCIPLINA[disciplina] || { ativo: '#6F3B9D', bg: '#EEEDFE', cor: '#6F3B9D' }
}

// ── Modal de confirmação customizado ──────────────────────────
function ModalConfirmar({ turma, onConfirmar, onCancelar }) {
  const c = coresDe(turma?.disciplina)
  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onCancelar} />
      <div className='modal-confirmar'>
        {/* Ícone */}
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
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover turma?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover a turma
        </p>

        {/* Card da turma */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: c.bg, margin: '0 0 6px',
          animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.ativo, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.cor }}>{turma?.nome}</div>
            <div style={{ fontSize: 11, color: c.cor, opacity: 0.7 }}>{turma?.disciplina} · {turma?.periodo}</div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Todos os registros de aula serão removidos permanentemente.
        </p>

        {/* Botões */}
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

export default function Turmas({ uid, professor }) {
  const isCoordenador = professor?.role === 'coordenador'
  const [turmas, setTurmas]                   = useState([])
  const [disciplinas, setDisciplinas]         = useState([])
  const [disciplinaAtiva, setDisciplinaAtiva] = useState(null)
  const [turmaAberta, setTurmaAberta]         = useState(null)
  const [registros, setRegistros]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [modalTurma, setModalTurma]           = useState(false)
  const [painelRegistro, setPainelRegistro]   = useState(false)
  const [formTurma, setFormTurma]             = useState(FORM_TURMA_INICIAL)
  const [formRegistro, setFormRegistro]       = useState(FORM_REGISTRO_INICIAL)
  const [salvando, setSalvando]               = useState(false)
  const [erroTurma, setErroTurma]             = useState('')
  const [erroRegistro, setErroRegistro]       = useState('')
  const [dropdownAberto, setDropdownAberto]   = useState(null)
  const [confirmarDelete, setConfirmarDelete] = useState(null) // objeto { id, nome, disciplina, periodo }

  const [professores, setProfessores]           = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

  useEffect(() => { if (uid) carregarTurmas() }, [uid, professor?.role])

  useEffect(() => {
    if (uid && isCoordenador) {
      buscarProfessores().then(dados => setProfessores(dados))
    }
  }, [uid, isCoordenador])

  async function carregarTurmas() {
    const dados = await buscarTurmas(uid, professor)
    setTurmas(dados)
    const discs = [...new Set(dados.map(t => t.disciplina))].filter(Boolean)
    setDisciplinas(discs)
    if (discs.length > 0) setDisciplinaAtiva(discs[0])
    setLoading(false)
  }

  async function abrirTurma(turma) {
    setTurmaAberta(turma)
    const regs = await buscarRegistros(turma.ownerUid || uid, turma.id)
    setRegistros(regs)
  }

  async function handleSalvarTurma() {
    if (!isCoordenador) return
    if (!formTurma.nome.trim())       { setErroTurma('Informe o nome da turma.'); return }
    if (!formTurma.disciplina.trim()) { setErroTurma('Informe a disciplina.'); return }
    setSalvando(true)
    try {
      await criarTurma(uid, formTurma)
      if (formTurma.professorId) {
    try {
      await criarNotificacao({
        titulo: "Nova Turma Vinculada",
        mensagem: `Você foi associado à turma "${formTurma.nome}" no período ${formTurma.periodo}.`,
        tipo: "turma", // Renderiza o emoji 🏫 conforme seu ICONES_TIPO
        link: "/turmas", // Direciona o professor para o painel de turmas dele
        destinatarioUids: [formTurma.professorId], // UID direto do professor associado
        criadoPorNome: "Coordenação"
      })
    } catch (notifErr) {
      console.error("Erro ao enviar notificação de vínculo de turma:", notifErr)
    }
  }
      await carregarTurmas()
      setModalTurma(false)
      setFormTurma(FORM_TURMA_INICIAL)
    } catch { setErroTurma('Erro ao salvar. Tente novamente.') }
    finally  { setSalvando(false) }
  }

  // Abre o modal customizado em vez do window.confirm
  function handleDeletarTurma(turma, e) {
    e.stopPropagation()
    setConfirmarDelete(turma)
  }

  // Executado ao confirmar no modal
  async function executarDelete() {
    if (!confirmarDelete) return
    await deletarTurma(confirmarDelete.ownerUid || uid, confirmarDelete.id)
    setConfirmarDelete(null)
    await carregarTurmas()
  }

  async function handleSalvarRegistro() {
    if (!isCoordenador) return
    if (!formRegistro.data)            { setErroRegistro('Informe a data da aula.'); return }
    if (!formRegistro.conteudo.trim()) { setErroRegistro('Informe o conteúdo da aula.'); return }
    setSalvando(true)
    try {
      const ownerUid = turmaAberta.ownerUid || uid
      await criarRegistroAula(ownerUid, turmaAberta.id, formRegistro)
      const regs = await buscarRegistros(ownerUid, turmaAberta.id)
      setRegistros(regs)
      setPainelRegistro(false)
      setFormRegistro(FORM_REGISTRO_INICIAL)
    } catch { setErroRegistro('Erro ao salvar. Tente novamente.') }
    finally  { setSalvando(false) }
  }

  async function handleDeletarRegistro(registroId) {
    if (!isCoordenador) return
    await deletarRegistro(turmaAberta.ownerUid || uid, turmaAberta.id, registroId)
    setRegistros(prev => prev.filter(r => r.id !== registroId))
  }

  function DropdownCustomizado({ label, opcoes, valor, onChange, id }) {
    return (
      <div className='perfil-grupo' style={{ position: 'relative', zIndex: dropdownAberto === id ? 99999 : 'auto' }}>
        {label && <label className='perfil-label'>{label}</label>}
        <button
          className={`dropdown-trigger ${dropdownAberto === id ? 'aberto' : ''}`}
          onClick={() => setDropdownAberto(dropdownAberto === id ? null : id)}
          style={{
            background: 'var(--branco)', border: '1px solid var(--borda)', borderRadius: '8px',
            padding: '9px 12px', fontSize: '13px', fontFamily: "'Poppins', sans-serif",
            color: 'var(--texto)', cursor: 'pointer', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', width: '100%',
          }}
        >
          <span>{valor}</span>
          <span className='arrow' style={{ fontSize: '16px', color: 'var(--roxo)' }}>▼</span>
        </button>
        {dropdownAberto === id && (
          <div className='dropdown-menu'
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px' }}
            onClick={e => e.stopPropagation()}>
            {opcoes.map(opt => (
              <button key={opt} className='dropdown-item'
                onClick={() => { onChange(opt); setDropdownAberto(null) }}
                style={{ background: valor === opt ? 'var(--roxo)' : 'var(--branco)', color: valor === opt ? 'white' : 'var(--texto)' }}>
                {valor === opt && <span style={{ marginRight: 8 }}>✓</span>}
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const turmasFiltradas = turmas.filter(t => t.disciplina === disciplinaAtiva)

  const professoresFiltrados = formTurma.professor.trim() === ''
    ? professores
    : professores.filter(p => p.nome.toLowerCase().includes(formTurma.professor.toLowerCase()))

  // ══════════════════════════════════════
  //  TELA: registros de uma turma
  // ══════════════════════════════════════
  if (turmaAberta) {
    return (
      <div className='card' style={{ position: 'relative', minHeight: 400 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className='btn-voltar' onClick={() => { setTurmaAberta(null); setPainelRegistro(false) }}>
              ← Voltar
            </button>
            <div className='registro-info'>
              <div style={{ fontSize: 16, color: 'var(--texto)', fontWeight: 600 }}>{turmaAberta.disciplina}</div>
              <div style={{ fontSize: 15, color: 'var(--texto-sec)' }}>{turmaAberta.nome}</div>
              {turmaAberta.professor && (
                <div style={{ fontSize: 12, color: 'var(--roxo)', fontWeight: 500 }}>Prof(a): {turmaAberta.professor}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {Object.entries(COR_TIPO).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.bg, flexShrink: 0 }} />
                <span style={{ fontSize: 16, color: 'var(--texto)', lineHeight: 1 }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de registros */}
        {registros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--texto-sec)', marginBottom: 16 }}>Nenhum registro ainda.</p>
            <div style={{ fontSize: 12, color: 'var(--texto-sec)' }}>Adicione novos registros de aulas</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registros.map((r, idx) => {
              const tipo = COR_TIPO[r.tipo] || COR_TIPO.teorica
              return (
                <div key={r.id} className='registro-pill' style={{ background: tipo.bg, animationDelay: `${idx * 50}ms` }}>
                  <span style={{ color: tipo.cor, fontSize: 13, flex: 1 }}>
                    Aula do dia {r.data.split('-').reverse().join('/')} — {r.conteudo}
                  </span>
                  {isCoordenador && (
                    <button className='arquivo-acao' style={{ color: tipo.cor, opacity: 0.6 }} onClick={() => handleDeletarRegistro(r.id)} title='Remover'>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isCoordenador && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--borda)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--texto-sec)' }}>Adicione novos registros de aulas</span>
            <button className='btn-upload' style={{ marginTop: 0 }} onClick={() => { setErroRegistro(''); setFormRegistro(FORM_REGISTRO_INICIAL); setPainelRegistro(true) }}>
              + Novo registro
            </button>
          </div>
        )}

        {/* Painel de novo registro */}
        {painelRegistro && (
          <>
            <div onClick={() => setPainelRegistro(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
            <div className='registro-modal' style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', maxWidth: 480,
              background: 'var(--branco)', borderRadius: 16, padding: 28,
              zIndex: 1200, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              animation: 'painel-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
              display: 'flex', flexDirection: 'column', gap: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--texto)', margin: '0 0 2px' }}>Novo registro de aula</h3>
                  <p style={{ fontSize: 15, color: 'var(--texto-sec)', margin: 0 }}>{turmaAberta.disciplina} · {turmaAberta.nome}</p>
                </div>
                <button onClick={() => setPainelRegistro(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <CustomDatePicker value={formRegistro.data} onChange={(dataStr) => setFormRegistro({ ...formRegistro, data: dataStr })} registros={registros} dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto} />

              <div className='perfil-grupo'>
                <label className='perfil-label'>Conteúdo</label>
                <input className='perfil-input' value={formRegistro.conteudo} onChange={e => setFormRegistro({ ...formRegistro, conteudo: e.target.value })} placeholder='Digite o conteúdo que será aplicado na aula' />
              </div>

              <div className='perfil-grupo'>
                <label className='perfil-label'>Descrição do conteúdo</label>
                <textarea className='perfil-input' rows={2} value={formRegistro.descricao} onChange={e => setFormRegistro({ ...formRegistro, descricao: e.target.value })} placeholder='Descreva o conteúdo que será aplicado na aula' />
              </div>

              <div className='perfil-grupo'>
                <label className='perfil-label'>Informações adicionais</label>
                <textarea className='perfil-input' rows={2} value={formRegistro.informacoes} onChange={e => setFormRegistro({ ...formRegistro, informacoes: e.target.value })} placeholder='Digite outras informações' />
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {Object.entries(COR_TIPO).map(([key, v]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginLeft: 4 }}>
                      <input type='radio' name='tipo-registro' value={key} checked={formRegistro.tipo === key} onChange={() => setFormRegistro({ ...formRegistro, tipo: key })} style={{ accentColor: 'var(--roxo)', width: 16, height: 16 }} />
                      <span style={{ fontSize: 12, color: 'var(--texto)' }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {erroRegistro && <p style={{ color: '#c0392b', fontSize: 12, margin: 0 }}>{erroRegistro}</p>}

              <button onClick={handleSalvarRegistro} disabled={salvando}
                style={{ marginTop: 10, width: '100%', padding: '14px', borderRadius: 40, border: 'none', background: 'var(--roxo)', color: '#fff', fontSize: 14, fontFamily: "'Poppins', sans-serif", fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.15s' }}
                onMouseEnter={e => { if (!salvando) e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                {salvando ? 'Salvando...' : 'Salvar novo registro de aula'}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════
  //  TELA: lista de turmas
  // ══════════════════════════════════════
  return (
    <div className='card'>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px' }}>Turmas</h2>
        <p style={{ fontSize: 14, color: 'var(--texto-sec)', margin: 0 }}>Disciplinas ministradas</p>
      </div>

      {loading ? (
        <p className='secao-vazia'>Carregando...</p>
      ) : turmas.length === 0 ? (
        <>
          <p className='secao-vazia'>Nenhuma turma cadastrada.</p>
          {isCoordenador && (
            <button className='btn-upload' onClick={() => { setErroTurma(''); setFormTurma(FORM_TURMA_INICIAL); setModalTurma(true) }}>
              + Nova turma
            </button>
          )}
        </>
      ) : (
        <>
          <div className='turma-tabs' style={{ marginBottom: 20 }}>
            {disciplinas.map(d => {
              const c = coresDe(d)
              const ativa = disciplinaAtiva === d
              return (
                <button key={d} className='turma-tab-pill'
                  style={{ background: ativa ? c.ativo : 'var(--roxo-claro)', color: ativa ? '#fff' : 'var(--texto)', borderColor: ativa ? c.ativo : 'transparent', transform: ativa ? 'scale(1.05)' : 'scale(1)' }}
                  onClick={() => setDisciplinaAtiva(d)}>
                  {d}
                </button>
              )
            })}
            {isCoordenador && (
              <button className='turma-tab-pill'
                style={{ background: 'none', color: 'var(--roxo)', border: '1.5px dashed var(--roxo)', marginLeft: 'auto' }}
                onClick={() => { setErroTurma(''); setFormTurma(FORM_TURMA_INICIAL); setModalTurma(true) }}>
                + Nova turma
              </button>
            )}
          </div>

          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)', margin: '0 0 12px' }}>{disciplinaAtiva}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {turmasFiltradas.map((t, idx) => {
              const c = coresDe(t.disciplina)
              return (
                <div key={t.id} style={{ position: 'relative' }}>
                  <button className='turma-card-pill'
                    style={{ background: c.bg, color: c.cor, animationDelay: `${idx * 60}ms` }}
                    onClick={() => abrirTurma(t)}>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{t.nome}</span>
                      <span style={{ fontSize: 11, opacity: 0.75 }}>{t.periodo}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 300 }}>›</span>
                  </button>
                  {isCoordenador && (
                    <button
                      onClick={e => handleDeletarTurma(t, e)}
                      style={{ position: 'absolute', top: '50%', right: 26, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35, transition: 'opacity .15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}
                      title='Remover turma'>
                      <Trash2 size={14} color={c.cor} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Modal de confirmação de delete ── */}
      {confirmarDelete && (
        <ModalConfirmar
          turma={confirmarDelete}
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDelete(null)}
        />
      )}

      {/* ── Modal Nova Turma com Autocomplete do Professor ── */}
      {isCoordenador && modalTurma && (
        <div className='modal-overlay' onClick={() => setModalTurma(false)}>
          <div className='modal' onClick={e => e.stopPropagation()}>
            <h3 className='modal-titulo'>Nova turma</h3>

            <div className='perfil-grupo'>
              <label className='perfil-label'>Nome da turma</label>
              <input className='perfil-input' value={formTurma.nome} onChange={e => setFormTurma({ ...formTurma, nome: e.target.value })} placeholder='Ex: 1º RH, 2º Eletrônica' autoFocus />
            </div>

            <div className='perfil-grupo'>
              <label className='perfil-label'>Disciplina</label>
              <input className='perfil-input' value={formTurma.disciplina} onChange={e => setFormTurma({ ...formTurma, disciplina: e.target.value })} placeholder='Ex: Matemática, Física, Química' />
            </div>

            {/* Campo Autocomplete de Professor */}
            <div className='perfil-grupo' style={{ position: 'relative', zIndex: mostrarSugestoes ? 99999 : 'auto' }}>
              <label className='perfil-label'>Professor</label>
              <input
                className='perfil-input'
                value={formTurma.professor}
                onChange={e => {
                  setFormTurma({ ...formTurma, professor: e.target.value, professorId: '' })
                  setMostrarSugestoes(true)
                }}
                onFocus={() => setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                placeholder='Digite o nome do professor...'
              />
              {mostrarSugestoes && (
                <div className='dropdown-menu' style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  maxHeight: '160px', overflowY: 'auto', zIndex: 1300, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {professoresFiltrados.length > 0 ? (
                    professoresFiltrados.map(p => (
                      <button
                        key={p.id}
                        type='button'
                        className='dropdown-item'
                        onClick={() => {
                          setFormTurma({ ...formTurma, professor: p.nome, professorId: p.id })
                          setMostrarSugestoes(false)
                        }}
                        style={{ background: 'var(--branco)', color: 'var(--texto)', textAlign: 'left', width: '100%', border: 'none', padding: '10px 12px', cursor: 'pointer' }}
                      >
                        {p.nome}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--texto-sec)', background: 'var(--branco)' }}>
                      Nenhum professor encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <DropdownCustomizado label='Período' opcoes={PERIODOS} valor={formTurma.periodo} onChange={periodo => setFormTurma({ ...formTurma, periodo })} id='periodo-turma' />

            {erroTurma && <p style={{ color: '#c0392b', fontSize: 12, margin: '4px 0' }}>{erroTurma}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className='perfil-salvar' onClick={handleSalvarTurma} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar turma'}
              </button>
              <button className='btn-cancelar' onClick={() => setModalTurma(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
