import { normalizarDisciplina } from './coresDisciplinas'

export const SUFIXOS_PROFESSORES_DISCIPLINA = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function chaveDisciplinaBase(disciplina) {
  return normalizarDisciplina(disciplina).replace(/\s+[B-Z]$/, '')
}

export function ehDisciplinaComSufixo(disciplina) {
  return /\s+[B-Z]$/.test(normalizarDisciplina(disciplina))
}

export function listarDisciplinasComCor(coresDisciplinas = {}) {
  const mapa = new Map()

  Object.entries(coresDisciplinas || {}).forEach(([chave, item]) => {
    const nome = item?.nome || chave
    const chaveBase = chaveDisciplinaBase(nome)
    if (!chaveBase || ehDisciplinaComSufixo(nome) || mapa.has(chaveBase)) return
    mapa.set(chaveBase, String(nome).trim())
  })

  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function nomeProfessorVinculo(vinculo = {}) {
  return vinculo.professorNomePDF || vinculo.professorNome || vinculo.professorEmail || ''
}

export function listarVinculosDisciplina(disciplina, vinculos = {}) {
  const chaveBase = chaveDisciplinaBase(disciplina)
  if (!chaveBase) return []

  return ['', ...SUFIXOS_PROFESSORES_DISCIPLINA]
    .map((sufixo) => {
      const chave = sufixo ? `${chaveBase} ${sufixo}` : chaveBase
      const vinculo = vinculos?.[chave]
      const nome = nomeProfessorVinculo(vinculo)

      if (!vinculo || !nome) return null

      return {
        ...vinculo,
        chave,
        sufixo,
        nome,
        valor: nome,
        label: nome,
      }
    })
    .filter(Boolean)
}

export function montarOpcoesProfessoresDisciplina(disciplina, vinculos = {}, {
  incluirSemProfessor = false,
  rotuloSemProfessor = 'Sem professor',
} = {}) {
  const opcoes = listarVinculosDisciplina(disciplina, vinculos)
    .map((vinculo) => ({
      valor: vinculo.valor,
      label: vinculo.label,
      professorId: vinculo.professorId || '',
      professorEmail: vinculo.professorEmail || '',
      sufixo: vinculo.sufixo || '',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  return incluirSemProfessor
    ? [{ valor: '', label: rotuloSemProfessor }, ...opcoes]
    : opcoes
}

export function professorPadraoDisciplina(disciplina, vinculos = {}, sufixoPreferido = '') {
  const vinculosDaDisciplina = listarVinculosDisciplina(disciplina, vinculos)
  if (vinculosDaDisciplina.length === 0) return ''

  const preferido = sufixoPreferido && sufixoPreferido !== 'A'
    ? vinculosDaDisciplina.find((vinculo) => vinculo.sufixo === sufixoPreferido)
    : vinculosDaDisciplina.find((vinculo) => !vinculo.sufixo)

  if (preferido?.nome) return preferido.nome

  return vinculosDaDisciplina
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))[0]?.nome || ''
}
