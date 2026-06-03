import { useState, useEffect } from 'react'
import {
  buscarTurmas, criarTurma, deletarTurma,
  buscarRegistros, criarRegistroAula, deletarRegistro
} from '../firebase/estrutura'
import './secoes.css'
import { Trash2, X } from 'lucide-react'
import CustomDatePicker from './dropdown-calendario'

const COR_DISCIPLINA = {
  'Matemática': { ativo: '#ED235C', bg: '#FCE4EC', cor: '#880e4f' },
  'Física':     { ativo: '#188AF5', bg: '#e3f2fd', cor: '#0d47a1' },
  'Química':    { ativo: '#0BDB23', bg: '#e8f5e9', cor: '#1b5e20' },
}

const COR_TIPO = {
  teorica:   { bg: '#0BDB23', cor: '#fff', label: 'Aula teórica'  },
  pratica:   { bg: '#ED235C', cor: '#fff', label: 'Aula Prática'  },
  atividade: { bg: '#FFBB00', cor: '#fff', label: 'Atividades'    },
  avaliacao: { bg: '#188AF5', cor: '#fff', label: 'Avaliações'    },
}

const PERIODOS = ['Matutino', 'Vespertino', 'Noturno']
const FORM_TURMA_INICIAL    = { nome: '', disciplina: '', periodo: 'Matutino' }
const FORM_REGISTRO_INICIAL = { data: '', conteudo: '', descricao: '', informacoes: '', tipo: 'teorica' }

function coresDe(disciplina) {
  return COR_DISCIPLINA[disciplina] || { ativo: '#6F3B9D', bg: '#EEEDFE', cor: '#6F3B9D' }
}

export default function Turmas({ uid }) {
  const [turmas, setTurmas]                   = useState([])
  const [disciplinas, setDisciplinas]         = useState([])
  const [disciplinaAtiva, setDisciplinaAtiva] = useState(null)
  const [turmaAberta, setTurmaAberta]         = useState(null)
  const [registros, setRegistros]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [modalTurma, setModalTurma]           = useState(false)
  const [painelRegistro, setPainelRegistro]   = useState(false)  // painel lateral, não modal
  const [formTurma, setFormTurma]             = useState(FORM_TURMA_INICIAL)
  const [formRegistro, setFormRegistro]       = useState(FORM_REGISTRO_INICIAL)
  const [salvando, setSalvando]               = useState(false)
  const [erroTurma, setErroTurma]             = useState('')
  const [erroRegistro, setErroRegistro]       = useState('')
  const [dropdownAberto, setDropdownAberto]   = useState(null)

  useEffect(() => { if (uid) carregarTurmas() }, [uid])

  async function carregarTurmas() {
    const dados = await buscarTurmas(uid)
    setTurmas(dados)
    const discs = [...new Set(dados.map(t => t.disciplina))].filter(Boolean)
    setDisciplinas(discs)
    if (discs.length > 0) setDisciplinaAtiva(discs[0])
    setLoading(false)
  }

  async function abrirTurma(turma) {
    setTurmaAberta(turma)
    const regs = await buscarRegistros(uid, turma.id)
    setRegistros(regs)
  }

  async function handleSalvarTurma() {
    if (!formTurma.nome.trim())       { setErroTurma('Informe o nome da turma.'); return }
    if (!formTurma.disciplina.trim()) { setErroTurma('Informe a disciplina.'); return }
    setSalvando(true)
    try {
      await criarTurma(uid, formTurma)
      await carregarTurmas()
      setModalTurma(false)
      setFormTurma(FORM_TURMA_INICIAL)
    } catch { setErroTurma('Erro ao salvar. Tente novamente.') }
    finally  { setSalvando(false) }
  }

  async function handleDeletarTurma(turmaId, e) {
    e.stopPropagation()
    if (!window.confirm('Tem certeza? Todos os registros desta turma serão removidos.')) return
    await deletarTurma(uid, turmaId)
    await carregarTurmas()
  }

  async function handleSalvarRegistro() {
    if (!formRegistro.data)            { setErroRegistro('Informe a data da aula.'); return }
    if (!formRegistro.conteudo.trim()) { setErroRegistro('Informe o conteúdo da aula.'); return }
    setSalvando(true)
    try {
      await criarRegistroAula(uid, turmaAberta.id, formRegistro)
      const regs = await buscarRegistros(uid, turmaAberta.id)
      setRegistros(regs)
      setPainelRegistro(false)
      setFormRegistro(FORM_REGISTRO_INICIAL)
    } catch { setErroRegistro('Erro ao salvar. Tente novamente.') }
    finally  { setSalvando(false) }
  }

  async function handleDeletarRegistro(registroId) {
    await deletarRegistro(uid, turmaAberta.id, registroId)
    setRegistros(prev => prev.filter(r => r.id !== registroId))
  }

  function DropdownCustomizado({ label, opcoes, valor, onChange, id }) {
    return (
      <div className='perfil-grupo' style={{ position: 'relative' }}>
        {label && <label className='perfil-label'>{label}</label>}
        <button
          className={`dropdown-trigger ${dropdownAberto === id ? 'aberto' : ''}`}
          onClick={() => setDropdownAberto(dropdownAberto === id ? null : id)}
          style={{
            background: 'white', border: '1px solid var(--borda)', borderRadius: '8px',
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
                style={{ background: valor === opt ? 'var(--roxo)' : 'white', color: valor === opt ? 'white' : 'var(--texto)' }}>
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

  // ══════════════════════════════════════
  //  TELA: registros de uma turma
  // ══════════════════════════════════════
  if (turmaAberta) {
    return (
      <div className='card' style={{ position: 'relative', minHeight: 400 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          {/* Esquerda: voltar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className='btn-voltar' onClick={() => { setTurmaAberta(null); setPainelRegistro(false) }}>
              ← Voltar
            </button>

            <div className='registro-info'>
              <div style={{ fontSize: 16, color: '#000000', fontWeight: 600 }}>{turmaAberta.disciplina}</div>
              <div style={{ fontSize: 15, color: '#555' }}>{turmaAberta.nome}</div>
            </div>
          </div>

          {/* Direita: legenda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            {Object.entries(COR_TIPO).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.bg, flexShrink: 0 }} />
                <span style={{ fontSize: 16, color: '#444' }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de registros */}
        {registros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>Nenhum registro ainda.</p>
            <div style={{ fontSize: 12, color: '#bbb' }}>
              Adicione novos registros de aulas
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registros.map((r, idx) => {
              const tipo = COR_TIPO[r.tipo] || COR_TIPO.teorica
              return (
                <div
                  key={r.id}
                  className='registro-pill'
                  style={{
                    background: tipo.bg,
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  <span style={{ color: tipo.cor, fontSize: 13, flex: 1 }}>
                    Aula do dia {r.data.split('-').reverse().join('/')} — {r.conteudo}
                  </span>
                  <button
                    className='arquivo-acao'
                    style={{ color: tipo.cor, opacity: 0.6 }}
                    onClick={() => handleDeletarRegistro(r.id)}
                    title='Remover'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Rodapé fixo com texto + botão estilizado */}
        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#aaa' }}>Adicione novos registros de aulas</span>
          <button
            className='btn-upload'
            style={{ marginTop: 0 }}
            onClick={() => { setErroRegistro(''); setFormRegistro(FORM_REGISTRO_INICIAL); setPainelRegistro(true) }}
          >
            + Novo registro
          </button>
        </div>

        {/* Painel de novo registro — slide-in pela direita */}
        {painelRegistro && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setPainelRegistro(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.25)',
                zIndex: 1100,
                backdropFilter: 'blur(2px)',
              }}
            />

            {/* Painel */}
            <div style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', maxWidth: 420,
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              zIndex: 1200,
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              animation: 'painel-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>

              {/* Título + fechar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 2px' }}>
                    Novo registro de aula
                  </h3>
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                    {turmaAberta.disciplina} · {turmaAberta.nome}
                  </p>
                </div>
                <button onClick={() => setPainelRegistro(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Data (Substituído pelo CustomDatePicker) */}
              <CustomDatePicker
                value={formRegistro.data}
                onChange={(dataStr) => setFormRegistro({ ...formRegistro, data: dataStr })}
                eventos={registros}
                dropdownAberto={dropdownAberto}
                setDropdownAberto={setDropdownAberto}
              />

              {/* Conteúdo */}
              <div className='perfil-grupo'>
                <label className='perfil-label'>Conteúdo</label>
                <input className='perfil-input' value={formRegistro.conteudo}
                  onChange={e => setFormRegistro({ ...formRegistro, conteudo: e.target.value })}
                  placeholder='Digite o conteúdo que será aplicado na aula' />
              </div>

              {/* Descrição */}
              <div className='perfil-grupo'>
                <label className='perfil-label'>Descrição do conteúdo</label>
                <textarea className='perfil-input' rows={2} value={formRegistro.descricao}
                  onChange={e => setFormRegistro({ ...formRegistro, descricao: e.target.value })}
                  placeholder='Descreva o conteúdo que será aplicado na aula' />
              </div>

              {/* Informações adicionais */}
              <div className='perfil-grupo'>
                <label className='perfil-label'>Informações adicionais</label>
                <textarea className='perfil-input' rows={2} value={formRegistro.informacoes}
                  onChange={e => setFormRegistro({ ...formRegistro, informacoes: e.target.value })}
                  placeholder='Digite outras informações' />
              </div>

              {/* Tipo — radio pills */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {Object.entries(COR_TIPO).map(([key, v]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type='radio'
                        name='tipo-registro'
                        value={key}
                        checked={formRegistro.tipo === key}
                        onChange={() => setFormRegistro({ ...formRegistro, tipo: key })}
style={{ accentColor: 'var(--roxo)', width: 16, height: 16 }}                      />
                      <span style={{ fontSize: 12, color: '#444' }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {erroRegistro && <p style={{ color: '#c0392b', fontSize: 12, margin: 0 }}>{erroRegistro}</p>}

              {/* Botão salvar */}
              <button
                onClick={handleSalvarRegistro}
                disabled={salvando}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 40, border: 'none',
                  background: 'var(--roxo)', color: '#fff',
                  fontSize: 14, fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer',
                  opacity: salvando ? 0.6 : 1,
                  transition: 'opacity 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { if (!salvando) e.currentTarget.style.transform = 'scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Turmas</h2>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Disciplinas ministradas</p>
      </div>

      {loading ? (
        <p className='secao-vazia'>Carregando...</p>
      ) : turmas.length === 0 ? (
        <>
          <p className='secao-vazia'>Nenhuma turma cadastrada.</p>
          <button className='btn-upload' onClick={() => { setErroTurma(''); setModalTurma(true) }}>
            + Nova turma
          </button>
        </>
      ) : (
        <>
          <div className='turma-tabs' style={{ marginBottom: 20 }}>
            {disciplinas.map(d => {
              const c = coresDe(d)
              const ativa = disciplinaAtiva === d
              return (
                <button key={d} className='turma-tab-pill'
                  style={{
                    background: ativa ? c.ativo : '#F1EDF4',
                    color:      ativa ? '#fff'  : '#555',
                    borderColor: ativa ? c.ativo : 'transparent',
                    transform: ativa ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onClick={() => setDisciplinaAtiva(d)}
                >
                  {d}
                </button>
              )
            })}
            <button className='turma-tab-pill'
              style={{ background: 'none', color: 'var(--roxo)', border: '1.5px dashed var(--roxo)', marginLeft: 'auto' }}
              onClick={() => { setErroTurma(''); setModalTurma(true) }}
            >
              + Nova turma
            </button>
          </div>

          <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 12px' }}>{disciplinaAtiva}</p>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
  {turmasFiltradas.map((t, idx) => {
    const c = coresDe(t.disciplina)
    return (
      <div key={t.id} style={{ position: 'relative' }}>
        <button className='turma-card-pill'
          style={{ background: c.bg, color: c.cor, animationDelay: `${idx * 60}ms` }}
          onClick={() => abrirTurma(t)}
        >
          <div style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{t.nome}</span>
            <span style={{ fontSize: 11, opacity: 0.75 }}>{t.periodo}</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 300 }}>›</span>
        </button>
        <button
          onClick={e => handleDeletarTurma(t.id, e)}
          style={{
            position: 'absolute', 
            top: '56%', 
            right: 30, // Alterado de 40 para 26 para ficar bem pertinho da seta!
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            opacity: 0.35, transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}
          title='Remover turma'
        >
          <Trash2 size={20} color={c.cor} />
        </button>
      </div>
    )
  })}
</div>
        </>
      )}

      {/* Modal nova turma */}
      {modalTurma && (
        <div className='modal-overlay' onClick={() => setModalTurma(false)}>
          <div className='modal' onClick={e => e.stopPropagation()}>
            <h3 className='modal-titulo'>Nova turma</h3>
            <div className='perfil-grupo'>
              <label className='perfil-label'>Nome da turma</label>
              <input className='perfil-input' value={formTurma.nome}
                onChange={e => setFormTurma({ ...formTurma, nome: e.target.value })}
                placeholder='Ex: 1º RH, 2º Eletrônica' autoFocus />
            </div>
            <div className='perfil-grupo'>
              <label className='perfil-label'>Disciplina</label>
              <input className='perfil-input' value={formTurma.disciplina}
                onChange={e => setFormTurma({ ...formTurma, disciplina: e.target.value })}
                placeholder='Ex: Matemática, Física, Química' />
            </div>
            <DropdownCustomizado label='Período' opcoes={PERIODOS}
              valor={formTurma.periodo}
              onChange={periodo => setFormTurma({ ...formTurma, periodo })}
              id='periodo-turma' />
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