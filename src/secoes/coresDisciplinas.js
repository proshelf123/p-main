export const CORES_RECOMENDADAS_DISCIPLINAS = [
  '#ED235C',
  '#188AF5',
  '#FFBB00',
  '#0BDB23',
  '#FF6A00',
  '#0D831E',
  '#00B5D5',
  '#810088',
]

export const CORES_PADRAO_DISCIPLINAS = {
  'MATEMATICA': '#ED235C',
  'FISICA': '#188AF5',
  'QUIMICA': '#FFBB00',
  'BIOLOGIA': '#0BDB23',
  'HISTORIA': '#FF6A00',
  'GEOGRAFIA': '#0D831E',
  'PORTUGUES': '#00B5D5',
  'ARTES': '#810088',
  'FILOSOFIA': '#760507',
  'INGLES': '#2F00FF',
  'EDUCACAO FISICA': '#FF6A00',
  'ED. FISICA': '#FF6A00',
  'SOCIOLOGIA': '#ED235C',
}

export function normalizarDisciplina(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export function normalizarHex(valor) {
  const limpo = String(valor || '').trim().replace(/^#/, '').slice(0, 6)
  return `#${limpo.toUpperCase()}`
}

export function hexValido(valor) {
  return /^#[0-9A-F]{6}$/i.test(String(valor || '').trim())
}

function hexParaRgb(hex) {
  const valor = normalizarHex(hex)
  if (!hexValido(valor)) return { r: 111, g: 59, b: 157 }
  return {
    r: parseInt(valor.slice(1, 3), 16),
    g: parseInt(valor.slice(3, 5), 16),
    b: parseInt(valor.slice(5, 7), 16),
  }
}

function rgbParaHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((canal) => Math.max(0, Math.min(255, Math.round(canal))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

function misturar(hex, alvo, peso) {
  const origem = hexParaRgb(hex)
  const destino = hexParaRgb(alvo)
  return rgbParaHex({
    r: origem.r + (destino.r - origem.r) * peso,
    g: origem.g + (destino.g - origem.g) * peso,
    b: origem.b + (destino.b - origem.b) * peso,
  })
}

function luminancia(hex) {
  const { r, g, b } = hexParaRgb(hex)
  const canais = [r, g, b].map((canal) => {
    const normalizado = canal / 255
    return normalizado <= 0.03928
      ? normalizado / 12.92
      : ((normalizado + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * canais[0]) + (0.7152 * canais[1]) + (0.0722 * canais[2])
}

export function resolverHexDisciplina(disciplina, coresCustomizadas = {}) {
  const chave = normalizarDisciplina(disciplina)
  const customizada = coresCustomizadas?.[chave]?.cor || coresCustomizadas?.[chave]
  if (hexValido(customizada)) return normalizarHex(customizada)
  if (chave.endsWith(' B')) {
    const chaveBase = chave.replace(/\s+B$/, '')
    const customizadaBase = coresCustomizadas?.[chaveBase]?.cor || coresCustomizadas?.[chaveBase]
    if (hexValido(customizadaBase)) return normalizarHex(customizadaBase)
    if (CORES_PADRAO_DISCIPLINAS[chaveBase]) return CORES_PADRAO_DISCIPLINAS[chaveBase]
  }
  return CORES_PADRAO_DISCIPLINAS[chave] || '#6F3B9D'
}

export function montarCoresDisciplina(disciplina, coresCustomizadas = {}) {
  const ativo = resolverHexDisciplina(disciplina, coresCustomizadas)
  return {
    ativo,
    bg: misturar(ativo, '#FFFFFF', 0.88),
    cor: luminancia(ativo) > 0.5 ? misturar(ativo, '#000000', 0.55) : ativo,
    textoSobreAtivo: luminancia(ativo) > 0.52 ? '#1A1A1A' : '#FFFFFF',
  }
}

export function montarGradienteDisciplina(disciplina, coresCustomizadas = {}) {
  const ativo = resolverHexDisciplina(disciplina, coresCustomizadas)
  return {
    bg: `linear-gradient(135deg, ${misturar(ativo, '#FFFFFF', 0.12)}, ${ativo})`,
    cor: luminancia(ativo) > 0.52 ? '#1A1A1A' : '#FFFFFF',
  }
}
