const CHAVE_TEMA_POR_USUARIO = 'proshelf:dark-mode:'

export function aplicarTemaEscuro(ativo) {
  document.documentElement.classList.toggle('dark-mode', Boolean(ativo))
}

export function removerTemaVisual() {
  document.documentElement.classList.remove('dark-mode')
}

export function buscarTemaLocal(uid) {
  if (!uid) return null
  const valor = localStorage.getItem(`${CHAVE_TEMA_POR_USUARIO}${uid}`)
  return valor === null ? null : valor === 'true'
}

export function salvarTemaLocal(uid, ativo) {
  if (!uid) return
  localStorage.setItem(`${CHAVE_TEMA_POR_USUARIO}${uid}`, String(Boolean(ativo)))
}

export function buscarTemaLegado() {
  const valor = localStorage.getItem('darkMode')
  return valor === null ? null : valor === 'true'
}

export function removerTemaLegado() {
  localStorage.removeItem('darkMode')
}
