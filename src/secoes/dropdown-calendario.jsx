import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S']

// 1. Recebemos o 'id' e o 'label' como props. 
// O fallback 'custom-date-picker' garante que as outras telas do sistema não quebrem.
export default function CustomDatePicker({ label, id = 'custom-date-picker', value, onChange, eventos = [], dropdownAberto, setDropdownAberto }) {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [view, setView] = useState('dias')

  // 2. Agora o 'open' valida usando o ID dinâmico
  const open = dropdownAberto === id

  useEffect(() => {
    if (value) {
      const [a, m] = value.split('-').map(Number)
      setAno(a); setMes(m - 1)
    }
  }, [value])

  function temEvento(dia) {
    const s = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return eventos.some(e => e.data === s)
  }

  function selecionarDia(dia) {
    const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    onChange(dataStr)
    setDropdownAberto(null)
  }

  function selecionarHoje() {
    const d = hoje
    setMes(d.getMonth()); setAno(d.getFullYear())
    const dataStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    onChange(dataStr)
    setDropdownAberto(null)
  }

  function handleOpen() {
    // 3. Ao clicar, ele seta o ID deste calendário específico
    setDropdownAberto(open ? null : id)
    setView('dias')
  }

  const displayValue = value ? value.split('-').reverse().join('/') : null

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const diaAtual = value ? parseInt(value.split('-')[2]) : null
  const mesAtual = value ? parseInt(value.split('-')[1]) - 1 : null
  const anoAtual = value ? parseInt(value.split('-')[0]) : null

  const celulas = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1)
  ]

  const baseAno = Math.floor(ano / 12) * 12
  const anos = Array.from({ length: 12 }, (_, i) => baseAno + i)

  const popup = open && (
    <div
      className="date-picker-popup"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)', /* ⬅️ A mágica: empurra exatamente 8px abaixo do input */
        left: 0,
        zIndex: 99999,
        background: 'var(--branco)',
        border: '1px solid #AFA9EC',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(111,59,157,0.18)',
        padding: 14,
        width: 260,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" className="cal-nav" onClick={() => {
          if (view === 'anos') { setAno(a => a - 12) }
          else if (view === 'meses') { setAno(a => a - 1) }
          else { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }
        }}>‹</button>

        <span
          style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'background .15s' }}
          onClick={() => setView(v => v === 'dias' ? 'meses' : v === 'meses' ? 'anos' : 'dias')}
        >
          {view === 'dias' && `${MESES[mes]} ${ano}`}
          {view === 'meses' && ano}
          {view === 'anos' && `${baseAno} – ${baseAno + 11}`}
        </span>

        <button type="button" className="cal-nav" onClick={() => {
          if (view === 'anos') { setAno(a => a + 12) }
          else if (view === 'meses') { setAno(a => a + 1) }
          else { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }
        }}>›</button>
      </div>

      {view === 'dias' && <>
        <div className="cal-grid" style={{ gap: 2 }}>
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} className="cal-dia-label">{d}</div>
          ))}
          {celulas.map((dia, i) => {
            if (!dia) return <div key={i} />
            const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
            const isSel = dia === diaAtual && mes === mesAtual && ano === anoAtual
            const ev = temEvento(dia)
            return (
              <div
                key={i}
                className={`cal-dia ${isHoje ? 'hoje' : ''} ${isSel ? 'selecionado' : ''} ${ev ? 'tem-evento' : ''}`}
                style={{ fontSize: 12, aspectRatio: '1', padding: 0, justifyContent: 'center', alignItems: 'center' }}
                onClick={() => selecionarDia(dia)}
              >
                {dia}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
          <button type="button" className="cal-nav" style={{ fontSize: 12, color: 'var(--texto-sec)' }} onClick={() => { onChange(''); setDropdownAberto(null) }}>Limpar</button>
          <button type="button" className="cal-nav" style={{ fontSize: 12 }} onClick={selecionarHoje}>Hoje</button>
        </div>
      </>}

      {view === 'meses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {MESES_ABREV.map((m, i) => (
            <button type="button" key={i} onClick={() => { setMes(i); setView('dias') }}
              className="cal-nav"
              style={{
                padding: '8px 4px', fontSize: 12, borderRadius: 6,
                background: i === mes ? 'var(--roxo)' : 'none',
                color: i === mes ? 'white' : 'var(--texto)'
              }}>
              {m}
            </button>
          ))}
        </div>
      )}

      {view === 'anos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {anos.map(a => (
            <button type="button" key={a} onClick={() => { setAno(a); setView('meses') }}
              className="cal-nav"
              style={{
                padding: '6px 2px', fontSize: 11, borderRadius: 6,
                background: a === ano ? 'var(--roxo)' : 'none',
                color: a === ano ? 'white' : 'var(--texto)'
              }}>
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="perfil-grupo" style={{ position: 'relative', zIndex: open ? 99999 : 100 }}>
      <label className="perfil-label">{label || "Data"}</label>

      <button
        type="button"
        className="perfil-input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left', background: 'var(--branco)'
        }}
        onClick={handleOpen}
      >
        <span style={{ color: displayValue ? 'var(--texto)' : 'var(--texto-sec)' }}>
          {displayValue ?? 'dd/mm/aaaa'}
        </span>
        <span style={{ color: 'var(--roxo)', fontSize: 16 }}><Calendar size={20} /></span>
      </button>

      {popup}
    </div>
  )
}