import { useState, useEffect } from 'react'
import { buscarEventos, criarEvento, deletarEvento } from '../firebase/estrutura'
import DropdownComPortal from './DropwdownComPortal'
import './secoes.css'
import CustomDatePicker from './dropdown-calendario'
import { Trash2, AlertTriangle } from 'lucide-react'
import { criarNotificacaoPorRole } from "../notificacoes/notificacoes"
import { auth } from "../firebase"

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']

const COR_TIPO = {
  evento:    { bg: '#e6fbed', cor: '#0BDB23', label: 'Evento'},
  reuniao:   { bg: '#EEEDFE', cor: '#188AF5', label: 'Reunião' },
  feriado:   { bg: '#e8f5e9', cor: '#FF6A00', label: 'Feriado' },
  passeio:   { bg: '#fce4ec', cor: '#ED235C', label: 'Passeio' },
}

const FORM_INICIAL = { titulo: '', data: '', tipo: 'reuniao', descricao: '' }

// ── Modal de confirmação customizado para Eventos ──────────────────────────
function ModalConfirmarEvento({ evento, onConfirmar, onCancelar }) {
  const tipo = COR_TIPO[evento?.tipo] || COR_TIPO.reuniao

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
          Remover evento?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover o evento
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: tipo.bg, margin: '0 0 6px',
          animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: tipo.cor, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tipo.cor }}>{evento?.titulo}</div>
            <div style={{ fontSize: 11, color: tipo.cor, opacity: 0.7 }}>
              {evento?.data ? evento.data.split('-').reverse().join('/') : ''} · {tipo.label}
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

export default function Calendario({ uid, professor }) {
  const isCoordenador = professor?.role === 'coordenador'
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [erro, setErro] = useState('')
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [dropdownAberto, setDropdownAberto] = useState(null)
  const [confirmarDelete, setConfirmarDelete] = useState(null)

  useEffect(() => {
    if (!uid) return
    buscarEventos(uid, professor).then(dados => { setEventos(dados); setLoading(false) })
  }, [uid, professor])

  function diasDoMes(m, a)         { return new Date(a, m + 1, 0).getDate() }
  function primeiroDiaSemana(m, a) { return new Date(a, m, 1).getDay() }

  function eventosDoDia(dia) {
    if (!dia) return []
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return eventos.filter(e => e.data === dataStr)
  }

  function eventosDoMes() {
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`
    return eventos
      .filter(e => e.data?.startsWith(prefixo))
      .sort((a, b) => a.data.localeCompare(b.data))
  }

  function formatarData(dataStr) {
    if (!dataStr) return ''
    const [, m, d] = dataStr.split('-')
    return `${d}/${m}`
  }

  function abrirModal(dia = null) {
    setErro('')
    if (dia) {
      const dataStr = `${ano}-${String(mes + 1).padStart(2, '00')}-${String(dia).padStart(2, '0')}`
      setForm({ ...FORM_INICIAL, data: dataStr })
    } else {
      setForm(FORM_INICIAL)
    }
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!isCoordenador) return

    if (!form.titulo.trim()) {
      setErro('Informe o título do evento.')
      return
    }

    if (!form.data) {
      setErro('Informe a data.')
      return
    }

    setSalvando(true)

    try {
      await criarEvento(uid, {
        ...form,
        compartilharComProfessores: true,
      })

      console.log('Evento criado. Criando notificação do evento...')

      try {
        const resultado = await criarNotificacaoPorRole({
          role: "professor",
          titulo: "Novo Evento no Calendário",
          mensagem: `O coordenador adicionou: "${form.titulo}"`,
          tipo: "calendario",
          link: "/calendario",
          criadoPorUid: auth.currentUser?.uid || uid,
          criadoPorNome:
            professor?.nome ||
            auth.currentUser?.displayName ||
            'Coordenação',
        })

        console.log('Resultado da criação de notificações:', resultado)
      } catch (erroNotificacao) {
        console.error(
          "Evento salvo, mas ocorreu erro ao criar notificação:",
          erroNotificacao
        )
      }

      const dados = await buscarEventos(uid, professor)

      setEventos(dados)
      setModalAberto(false)
      setForm(FORM_INICIAL)
      setErro('')
    } catch (err) {
      console.error("Erro ao salvar evento:", err)
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  function handleDeletar(evento, e) {
    e?.stopPropagation()
    if (!isCoordenador) return
    setConfirmarDelete(evento)
  }

  async function executarDelete() {
    if (!isCoordenador || !confirmarDelete) return

    try {
      await deletarEvento(uid, confirmarDelete.id)
      const dados = await buscarEventos(uid, professor)
      setEventos(dados)
      setConfirmarDelete(null)
    } catch (err) {
      console.error("Erro ao remover evento:", err)
      setErro("Erro ao remover evento. Tente novamente.")
    }
  }

  const total = diasDoMes(mes, ano)
  const primeiro = primeiroDiaSemana(mes, ano)
  const celulas = Array(primeiro).fill(null).concat(Array.from({ length: total }, (_, i) => i + 1))
  const eventosDiaSel = eventosDoDia(diaSelecionado)

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
          <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
            Calendário
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Verifique feriados, eventos e tudo mais
          </p>
        </div>
      </div>
      {/* --- FIM DO HEADER --- */}

      {/* ── Grid para Calendário e Eventos lado a lado ── */}
      <div className='grid-2' style={{ alignItems: 'start' }}>
        {/* ── Calendário visual ── */}
        <div className='card'>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            background: 'var(--roxo)',
            borderRadius: 40,
            padding: '8px 12px',
          }}>
            <button
              className='cal-nav-header'
              onClick={() => { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }}
            >‹</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
              {MESES[mes]} {ano}
            </span>
            <button
              className='cal-nav-header'
              onClick={() => { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }}
            >›</button>
          </div>

          <div className='cal-grid'>
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className='cal-dia-label'>{d}</div>
            ))}
            {celulas.map((dia, i) => {
              if (!dia) return <div key={i} className='cal-dia vazia' />

              const isHoje        = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
              const isSelecionado = dia === diaSelecionado
              const evsDia        = eventosDoDia(dia)
              const temEv         = evsDia.length > 0

              return (
                <div
                  key={isSelecionado ? `sel-${i}` : i}
                  className={`cal-dia ${isHoje ? 'hoje' : ''} ${temEv ? 'tem-evento' : ''} ${isSelecionado ? 'selecionado' : ''}`}
                  onClick={() => setDiaSelecionado(dia === diaSelecionado ? null : dia)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className='cal-dia-num'>{dia}</span>

                  {temEv && (
                    <div className='cal-dia-bolinhas'>
                      {evsDia.slice(0, 3).map(ev => {
                        const tipo = COR_TIPO[ev.tipo] || COR_TIPO.reuniao
                        return (
                          <span
                            key={ev.id}
                            className='cal-ev-bolinha'
                            style={{ background: tipo.cor }}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Eventos do dia selecionado */}
          {diaSelecionado && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--texto)' }}>
                  {String(diaSelecionado).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}
                </span>
              </div>
              {eventosDiaSel.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: 0 }}>Nenhum evento neste dia.</p>
              ) : (
                eventosDiaSel.map(ev => {
                  const tipo = COR_TIPO[ev.tipo] || COR_TIPO.reuniao
                  return (
                    <div key={ev.id} className='cal-evento' style={{ borderLeftColor: tipo.cor }}>
                      <div className='cal-evento-nome'>{ev.titulo}</div>
                      <span className='cal-evento-badge' style={{ background: tipo.bg, color: tipo.cor }}>{tipo.label}</span>
                      {isCoordenador && (
                        <button className='arquivo-acao' onClick={(e) => handleDeletar(ev, e)} title='Remover'><Trash2 size={16} /></button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* ── Eventos do mês ── */}
        <div className='card'>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className='card-titulo' style={{ marginBottom: 0 }}>Eventos em: {MESES[mes]}</div>
            {isCoordenador && (
              <button className='btn-upload' style={{ marginTop: 0 }} onClick={() => abrirModal()}>
                + Novo evento
              </button>
            )}
          </div>

          {loading ? (
            <p className='secao-vazia'>Carregando...</p>
          ) : eventosDoMes().length === 0 ? (
            <p className='secao-vazia'>Nenhum evento neste mês.</p>
          ) : (
            eventosDoMes().map(ev => {
              const tipo = COR_TIPO[ev.tipo] || COR_TIPO.reuniao
              return (
                <div
                  key={ev.id}
                  className='cal-evento'
                  style={{ borderLeftColor: tipo.cor, cursor: 'pointer' }}
                  onClick={() => {
                    const dia = parseInt(ev.data.split('-')[2])
                    setDiaSelecionado(dia)
                  }}
                >
                  <div className='cal-evento-data'>{formatarData(ev.data)}</div>
                  <div className='cal-evento-nome'>{ev.titulo}</div>
                  <span className='cal-evento-badge' style={{ background: tipo.bg, color: tipo.cor }}>{tipo.label}</span>
                  {isCoordenador && (
                    <button className='arquivo-acao' onClick={(e) => handleDeletar(ev, e)} title='Remover'><Trash2 size={16} /></button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Modal novo evento ── */}
      {isCoordenador && modalAberto && (
        <div className='modal-overlay' onClick={() => setModalAberto(false)}>
          <div className='modal' onClick={e => e.stopPropagation()}>
            <h3 className='modal-titulo'>Novo evento</h3>

            <div className='perfil-grupo'>
              <label className='perfil-label'>Título</label>
              <input
                className='perfil-input'
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder='Nome do evento'
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CustomDatePicker
                value={form.data}
                onChange={(dataStr) => setForm({ ...form, data: dataStr })}
                eventos={eventos}
                dropdownAberto={dropdownAberto}
                setDropdownAberto={setDropdownAberto}
              />
              <DropdownComPortal
                label='Tipo'
                opcoes={Object.values(COR_TIPO).map(v => v.label)}
                valor={COR_TIPO[form.tipo].label}
                onChange={(opt) => {
                  const tipoKey = Object.entries(COR_TIPO).find(([, v]) => v.label === opt)?.[0]
                  setForm({ ...form, tipo: tipoKey })
                }}
                id='tipo-evento'
                dropdownAberto={dropdownAberto}
                setDropdownAberto={setDropdownAberto}
              />
            </div>

            <div className='perfil-grupo'>
              <label className='perfil-label'>Descrição (opcional)</label>
              <textarea
                className='perfil-input'
                rows={2}
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder='Detalhes do evento'
              />
            </div>

            {erro && <p style={{ color: '#c0392b', fontSize: 12, margin: '4px 0' }}>{erro}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className='perfil-salvar' onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar evento'}
              </button>
              <button className='btn-cancelar' onClick={() => setModalAberto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de delete ── */}
      {confirmarDelete && (
        <ModalConfirmarEvento
          evento={confirmarDelete}
          onConfirmar={executarDelete}
          onCancelar={() => setConfirmarDelete(null)}
        />
      )}
    </div>
  )
}