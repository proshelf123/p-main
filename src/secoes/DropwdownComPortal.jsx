import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'

export default function DropdownComPortal({ label, opcoes, valor, onChange, id, dropdownAberto, setDropdownAberto }) {
  const buttonRef = useRef(null)
  const [posicao, setPosicao] = useState(null)
  const opcoesNormalizadas = opcoes.map((opt) => {
    if (opt && typeof opt === 'object') {
      const valorOpcao = opt.valor ?? opt.value ?? opt.label ?? ''
      return { valor: valorOpcao, label: opt.label ?? valorOpcao }
    }

    return { valor: opt, label: opt }
  })
  const opcaoSelecionada = opcoesNormalizadas.find((opt) => opt.valor === valor || opt.label === valor)
  const valorExibido = opcaoSelecionada?.label ?? valor

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

  useEffect(() => {
    if (dropdownAberto !== id) return

    function handlePointerDown(e) {
      const clicouNoBotao = buttonRef.current?.contains(e.target)
      const portal = e.target.closest?.('[data-dropdown-portal-id]')
      const clicouNoMenu = portal?.dataset?.dropdownPortalId === id

      if (!clicouNoBotao && !clicouNoMenu) {
        setDropdownAberto(null)
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setDropdownAberto(null)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownAberto, id, setDropdownAberto])

  const handleClickButton = () => {
    setDropdownAberto(dropdownAberto === id ? null : id)
  }

  const handleSelectItem = (opt) => {
    onChange(opt?.valor ?? opt)
    setDropdownAberto(null)
  }

  return (
    <div className='perfil-grupo' style={{ position: 'relative' }}>
      {label && <label className='perfil-label'>{label}</label>}
      
      <button
        ref={buttonRef}
        className={`dropdown-trigger ${dropdownAberto === id ? 'aberto' : ''}`}
        type='button'
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
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--roxo)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--borda)'}
      >
        <span>{valorExibido}</span>
        <span className='arrow' style={{ fontSize: '16px', color: 'var(--roxo)', transition: 'transform 0.3s ease', transform: dropdownAberto === id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {/* Portal - renderiza FORA do modal, no body */}
      {dropdownAberto === id && posicao && ReactDOM.createPortal(
        <div
          className='dropdown-menu'
          data-dropdown-portal-id={id}
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
          {opcoesNormalizadas.map((opt, index) => (
            <button
              key={opt.valor || opt.label}
              className='dropdown-item'
              onClick={() => handleSelectItem(opt)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: 'none',
                background: valor === opt.valor ? 'var(--roxo)' : 'var(--branco)',
                color: valor === opt.valor ? 'white' : 'var(--texto)',
                fontSize: '13px',
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                borderRadius: index === 0 ? '7px 7px 0 0' : index === opcoesNormalizadas.length - 1 ? '0 0 7px 7px' : '0',
              }}
              onMouseEnter={(e) => {
                if (valor !== opt.valor) e.target.style.backgroundColor = '#F1EDF4'
              }}
              onMouseLeave={(e) => {
                if (valor !== opt.valor) e.target.style.backgroundColor = 'var(--branco)'
              }}
            >
              {valor === opt.valor && <span style={{ marginRight: '8px' }}>✓</span>}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body  // ← Renderiza no body, FORA do modal
      )}
    </div>
  )
}
