import { useEffect, useRef, useState } from 'react'
import './ColorPickerDisciplina.css'

const PALETTE = [
  '#6F3B9D', '#F97316', '#3B82F6', '#10B981', '#EF4444',
  '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6', '#6366F1',
  '#84CC16', '#06B6D4', '#F43F5E', '#A855F7', '#FB923C',
  '#22C55E', '#0EA5E9', '#D946EF', '#EAB308', '#64748B',
]

function hexValido(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function normalizarHex(hex) {
  if (!hex) return ''
  const h = hex.startsWith('#') ? hex : '#' + hex
  return h.toUpperCase()
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

function lighten(hex, amount = 35) {
  if (!hexValido(hex)) return '#f3ecfb'
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, Math.max(s - 20, 10), Math.min(l + amount, 95))
}

function darken(hex, amount = 30) {
  if (!hexValido(hex)) return '#3d1f57'
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, Math.min(s + 10, 100), Math.max(l - amount, 10))
}

export default function ColorPickerDisciplina({ value, onChange, disciplina }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value || '#6F3B9D')
  const [hexInput, setHexInput] = useState(value || '#6F3B9D')
  const [hue, setHue] = useState(270)
  const [sat, setSat] = useState(60)
  const wrapperRef = useRef(null)
  const hueStripRef = useRef(null)
  const satStripRef = useRef(null)
  const hueDragging = useRef(false)
  const satDragging = useRef(false)

  // Sync quando o valor externo mudar
  useEffect(() => {
    if (value && hexValido(value)) {
      setDraft(value)
      setHexInput(value.toUpperCase())
      const { h, s } = hexToHsl(value)
      setHue(h)
      setSat(s)
    }
  }, [value])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Slider drag — hue
  useEffect(() => {
    function onMove(e) {
      if (!hueDragging.current || !hueStripRef.current) return
      const rect = hueStripRef.current.getBoundingClientRect()
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const pct = Math.min(1, Math.max(0, (cx - rect.left) / rect.width))
      const newHue = Math.round(pct * 360)
      setHue(newHue)
      const { l } = hexToHsl(draft)
      const newHex = hslToHex(newHue, sat, l || 50)
      applyDraft(newHex, newHue, sat)
    }
    function onUp() { hueDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [draft, sat])

  // Slider drag — sat
  useEffect(() => {
    function onMove(e) {
      if (!satDragging.current || !satStripRef.current) return
      const rect = satStripRef.current.getBoundingClientRect()
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const pct = Math.min(1, Math.max(0, (cx - rect.left) / rect.width))
      const newSat = Math.round(pct * 100)
      setSat(newSat)
      const { l } = hexToHsl(draft)
      const newHex = hslToHex(hue, newSat, l || 50)
      applyDraft(newHex, hue, newSat)
    }
    function onUp() { satDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [draft, hue])

  function applyDraft(hex, h, s) {
    if (!hexValido(hex)) return
    const upper = hex.toUpperCase()
    setDraft(upper)
    setHexInput(upper)
    if (h !== undefined) setHue(h)
    if (s !== undefined) setSat(s)
  }

  function handlePaletteClick(cor) {
    const { h, s } = hexToHsl(cor)
    applyDraft(cor, h, s)
  }

  function handleHexInput(e) {
    let v = e.target.value
    if (!v.startsWith('#')) v = '#' + v
    setHexInput(v.toUpperCase())
    if (hexValido(v)) {
      const { h, s } = hexToHsl(v)
      applyDraft(v, h, s)
    }
  }

  function handleAplicar() {
    if (hexValido(draft)) {
      onChange(draft)
    }
    setOpen(false)
  }

  function handleLimpar() {
    applyDraft('#6F3B9D', 270, 60)
  }

  function handleHueClick(e) {
    if (!hueStripRef.current) return
    const rect = hueStripRef.current.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const newHue = Math.round(pct * 360)
    setHue(newHue)
    const { l } = hexToHsl(draft)
    const newHex = hslToHex(newHue, sat, l || 50)
    applyDraft(newHex, newHue, sat)
  }

  function handleSatClick(e) {
    if (!satStripRef.current) return
    const rect = satStripRef.current.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const newSat = Math.round(pct * 100)
    setSat(newSat)
    const { l } = hexToHsl(draft)
    const newHex = hslToHex(hue, newSat, l || 50)
    applyDraft(newHex, hue, newSat)
  }

  const corValida = hexValido(draft) ? draft : '#6F3B9D'
  const { l: lightnessDraft } = hexToHsl(corValida)
  const previewBg = lighten(corValida, 38)
  const previewFg = darken(corValida, 30)

  return (
    <div className='cpd-wrapper' ref={wrapperRef}>
      {/* Trigger */}
      <div
        className={`cpd-field${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        role='button'
        aria-haspopup='true'
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
      >
        <span className='cpd-swatch-trigger' style={{ background: corValida }} />
        <span className='cpd-field-text'>{normalizarHex(draft)}</span>
        <span className='cpd-chevron'>▾</span>
      </div>

      {/* Popover */}
      {open && (
        <div className='cpd-popover-wrap'>
          <div className='cpd-popover'>
            <div className='cpd-body'>

              {/* Preview da disciplina */}
              {disciplina && (
                <div className='cpd-preview-pill' style={{ background: previewBg, color: previewFg }}>
                  <span className='cpd-preview-dot' style={{ background: corValida }} />
                  <span>{disciplina}</span>
                </div>
              )}

              {/* Swatch + Hex */}
              <div className='cpd-hex-row'>
                <div className='cpd-swatch-big' style={{ background: corValida }} />
                <input
                  className='cpd-hex-input'
                  value={hexInput}
                  onChange={handleHexInput}
                  maxLength={7}
                  spellCheck={false}
                  placeholder='#RRGGBB'
                  aria-label={`Código hexadecimal${disciplina ? ` de ${disciplina}` : ''}`}
                />
              </div>

              {/* Paleta */}
              <p className='cpd-section-label'>Paleta recomendada</p>
              <div className='cpd-palette'>
                {PALETTE.map((cor) => (
                  <button
                    key={cor}
                    className={`cpd-palette-btn${normalizarHex(draft) === cor ? ' ativo' : ''}`}
                    style={{ background: cor }}
                    onClick={() => handlePaletteClick(cor)}
                    title={cor}
                    aria-label={`Usar ${cor}${disciplina ? ` em ${disciplina}` : ''}`}
                  />
                ))}
              </div>

              {/* Slider Matiz */}
              <p className='cpd-section-label'>Matiz</p>
              <div
                className='cpd-hue-strip'
                ref={hueStripRef}
                onClick={handleHueClick}
                onMouseDown={() => { hueDragging.current = true }}
                onTouchStart={() => { hueDragging.current = true }}
              >
                <div className='cpd-slider-thumb' style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue},100%,50%)` }} />
              </div>

              {/* Slider Saturação */}
              <p className='cpd-section-label'>Saturação</p>
              <div
                className='cpd-sat-strip'
                ref={satStripRef}
                style={{ background: `linear-gradient(to right, #888, hsl(${hue},100%,50%))` }}
                onClick={handleSatClick}
                onMouseDown={() => { satDragging.current = true }}
                onTouchStart={() => { satDragging.current = true }}
              >
                <div className='cpd-slider-thumb' style={{ left: `${sat}%`, background: `hsl(${hue},${sat}%,50%)` }} />
              </div>

            </div>

            {/* Rodapé */}
            <div className='cpd-footer'>
              <button className='cpd-btn-limpar' onClick={handleLimpar}>Limpar</button>
              <button className='cpd-btn-aplicar' onClick={handleAplicar}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}