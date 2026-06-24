import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'

export default function DropdownComPortal({ label, opcoes, valor, onChange, id, dropdownAberto, setDropdownAberto }) {
  const buttonRef = useRef(null)
  const [posicao, setPosicao] = useState(null)

  useEffect(() => {
    if (dropdownAberto === id && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosicao({
        top: rect.top + rect.height + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [dropdownAberto, id])

  const handleClickButton = () => {
    setDropdownAberto(dropdownAberto === id ? null : id)
  }

  const handleSelectItem = (opt) => {
    onChange(opt)
    setDropdownAberto(null)
  }

  return (
    <div className='perfil-grupo' style={{ position: 'relative' }}>
      {label && <label className='perfil-label'>{label}</label>}
      
      <button
        ref={buttonRef}
        className={`dropdown-trigger ${dropdownAberto === id ? 'aberto' : ''}`}
        onClick={handleClickButton}
        style={{
          background: 'var(--branco)',
          border: '1px solid var(--borda)',
          borderRadius: '8px',
          padding: '9px 12px',
          fontSize: '13px',
          fontFamily: "'Poppins', sans-serif",
          color: 'var(--texto)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          transition: 'all 0.15s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => e.target.style.borderColor = 'var(--roxo)'}
        onMouseLeave={(e) => e.target.style.borderColor = 'var(--borda)'}
      >
        <span>{valor}</span>
        <span className='arrow' style={{ fontSize: '16px', color: 'var(--roxo)', transition: 'transform 0.3s ease', transform: dropdownAberto === id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {/* Portal - renderiza FORA do modal, no body */}
      {dropdownAberto === id && posicao && ReactDOM.createPortal(
        <div
          className='dropdown-menu'
          style={{
            position: 'fixed',
            top: posicao.top,
            left: posicao.left,
            width: posicao.width,
            background: 'var(--branco)',
            border: '1px solid var(--roxo)',
            borderRadius: '8px',
            zIndex: 999999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            maxHeight: '300px',
            overflowY: 'auto',
            animation: 'slideDown 0.15s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {opcoes.map((opt) => (
            <button
              key={opt}
              className='dropdown-item'
              onClick={() => handleSelectItem(opt)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: 'none',
                background: valor === opt ? 'var(--roxo)' : 'var(--branco)',
                color: valor === opt ? 'white' : 'var(--texto)',
                fontSize: '13px',
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                borderRadius: opt === opcoes[0] ? '7px 7px 0 0' : opt === opcoes[opcoes.length - 1] ? '0 0 7px 7px' : '0',
              }}
              onMouseEnter={(e) => {
                if (valor !== opt) e.target.style.backgroundColor = '#F1EDF4'
              }}
              onMouseLeave={(e) => {
                if (valor !== opt) e.target.style.backgroundColor = 'var(--branco)'
              }}
            >
              {valor === opt && <span style={{ marginRight: '8px' }}>✓</span>}
              {opt}
            </button>
          ))}
        </div>,
        document.body  // ← Renderiza no body, FORA do modal
      )}
    </div>
  )
}
