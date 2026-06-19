import { useState, useEffect } from 'react'
import { buscarEventos, criarEvento, deletarEvento } from '../firebase/estrutura'
import DropdownComPortal from './DropwdownComPortal'
import './secoes.css'
import CustomDatePicker from './dropdown-calendario'
import { Trash2, AlertTriangle } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']

const COR_TIPO = {
  evento:    { bg: '#e6fbed', cor: '#0BDB23', label: 'Evento'},
  reuniao:   { bg: '#EEEDFE', cor: '#188AF5', label: 'Reunião' },
  feriado:   { bg: '#e8f5e9', cor: '#FF6A00', label: 'Feriado' },
  passeio:   { bg: '#fce4ec', cor: '#ED235C', label: 'Passeio' },
}

const FORM_INICIAL = { titulo: '', data: '', tipo: 'reuniao', descricao: '' }

import { criarNotificacaoPorRole } from "../notificacoes/notificacoes";

async function handleSalvarEvento(dadosEvento, usuarioLogado) {
  try {
    // 1. Salva o evento no calendário (sua lógica atual)
    await criarEvento(usuarioLogado.uid, dadosEvento);

    // 2. Dispara a notificação para todos os professores
    await criarNotificacaoPorRole({
      role: "professor",
      titulo: "Novo Evento no Calendário",
      mensagem: `O coordenador adicionou: "${dadosEvento.titulo}"`,
      tipo: "calendario", // vai renderizar o emoji 📅 conforme seu ICONES_TIPO
      link: "/calendario", // rota para onde o professor vai ao clicar
      criadoPorUid: usuarioLogado.uid,
      criadoPorNome: usuarioLogado.nome
    });

    console.log("Evento criado e professores notificados!");
  } catch (error) {
    console.error("Erro:", error);
  }
}

// ── Modal de confirmação customizado para Eventos ──────────────────────────
function ModalConfirmarEvento({ evento, onConfirmar, onCancelar }) {
  const tipo = COR_TIPO[evento?.tipo] || COR_TIPO.reuniao

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
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', textAlign: 'center' }}>
          Remover evento?
        </h3>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover o evento
        </p>

        {/* Card do evento */}
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

        <p style={{ fontSize: 12, color: '#999', margin: '0 0 20px', textAlign: 'center' }}>
          Esta ação não poderá ser desfeita.
        </p>

        {/* Botões */}
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

export default function Calendario({ uid }) {
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
  const [confirmarDelete, setConfirmarDelete] = useState(null) // Novo estado para o alerta

  useEffect(() => {
    if (!uid) return
    buscarEventos(uid).then(dados => { setEventos(dados); setLoading(false) })
  }, [uid])

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
    if (!form.titulo.trim()) { setErro('Informe o título do evento.'); return }
    if (!form.data)          { setErro('Informe a data.'); return }
    setSalvando(true)
    try {
      await criarEvento(uid, form)
      const dados = await buscarEventos(uid)
      setEventos(dados)
      setModalAberto(false)
      setForm(FORM_INICIAL)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // Função para abrir o alerta
  function handleDeletar(evento, e) {
    if (e) e.stopPropagation()
    setConfirmarDelete(evento)
  }

  // Função para realmente excluir
  async function executarDelete() {
    if (!confirmarDelete) return
    const id = confirmarDelete.id
    await deletarEvento(uid, id)
    setEventos(prev => prev.filter(e => e.id !== id))
    setConfirmarDelete(null)
  }

  const total = diasDoMes(mes, ano)
  const primeiro = primeiroDiaSemana(mes, ano)
  const celulas = Array(primeiro).fill(null).concat(Array.from({ length: total }, (_, i) => i + 1))
  const eventosDiaSel = eventosDoDia(diaSelecionado)

  return (
    <div className='grid-2'>

      {/* ── Calendário visual ── */}
      <div className='card'>

        {/* Header roxo pill */}
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

        {/* Grade do calendário */}
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
                {/* Número do dia */}
                <span className='cal-dia-num'>{dia}</span>

                {/* Bolinhas coloridas — máx 3, sem texto */}
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
          <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                {String(diaSelecionado).padStart(2, '0')}/{String(mes + 1).padStart(2, '0')}
              </span>
            </div>
            {eventosDiaSel.length === 0 ? (
              <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Nenhum evento neste dia.</p>
            ) : (
              eventosDiaSel.map(ev => {
                const tipo = COR_TIPO[ev.tipo] || COR_TIPO.reuniao
                return (
                  <div key={ev.id} className='cal-evento' style={{ borderLeftColor: tipo.cor }}>
                    <div className='cal-evento-nome'>{ev.titulo}</div>
                    <span className='cal-evento-badge' style={{ background: tipo.bg, color: tipo.cor }}>{tipo.label}</span>
                    <button className='arquivo-acao' onClick={(e) => handleDeletar(ev, e)} title='Remover'><Trash2 size={16} /></button>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>{/* fim card calendário */}

      {/* ── Eventos do mês ── */}
      <div className='card'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className='card-titulo' style={{ marginBottom: 0 }}>Eventos em: {MESES[mes]}</div>
          <button className='btn-upload' style={{ marginTop: 0 }} onClick={() => abrirModal()}>
            + Novo evento
          </button>
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
                <button className='arquivo-acao' onClick={(e) => handleDeletar(ev, e)} title='Remover'><Trash2 size={16} /></button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal novo evento ── */}
      {modalAberto && (
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