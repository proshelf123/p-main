// src/secoes/Cronogramas.jsx
import { useState, useEffect } from 'react'
import { buscarCronograma } from '../firebase/estrutura'
import '../dashboard/dashboard.css'
import './secoes.css'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const MENSAGEM_SEM_HORARIO = 'Nenhum horário encontrado. Aguarde o coordenador fazer o upload do PDF.'

const DIA_LABEL = {
  DOM: 'Domingo',
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sábado',
}

const DIA_LABEL_COMPLETO = {
  DOM: 'Domingo',
  SEG: 'Segunda-feira',
  TER: 'Terça-feira',
  QUA: 'Quarta-feira',
  QUI: 'Quinta-feira',
  SEX: 'Sexta-feira',
  SAB: 'Sábado',
}

const NOMES_DISCIPLINA = {
  MAT: 'Matemática', FIS: 'Física', QUI: 'Química',
  BIO: 'Biologia', PORT: 'Português', ING: 'Inglês',
  HIS: 'História', GEO: 'Geografia', FIL: 'Filosofia',
  SOCI: 'Sociologia', ARTE: 'Arte',
  'ED. FIS': 'Ed. Física', 'ED.FIS': 'Ed. Física',
}

const COR_DISCIPLINA = {
  'Matemática': { bg: 'linear-gradient(135deg, #f72585, #c9184a)', cor: '#fff' },
  'Física':     { bg: 'linear-gradient(135deg, #4cc9f0, #0096c7)', cor: '#fff' },
  'Química':    { bg: 'linear-gradient(135deg, #f8c537, #f3a300)', cor: '#fff' },
  'Biologia':   { bg: 'linear-gradient(135deg, #a855f7, #7c3aed)', cor: '#fff' },
  'Português':  { bg: 'linear-gradient(135deg, #ff6b35, #e63946)', cor: '#fff' },
  'Inglês':     { bg: 'linear-gradient(135deg, #06d6a0, #0077b6)', cor: '#fff' },
  'História':   { bg: 'linear-gradient(135deg, #ff9f1c, #e07000)', cor: '#fff' },
  'Geografia':  { bg: 'linear-gradient(135deg, #3a86ff, #1d4ed8)', cor: '#fff' },
  'Filosofia':  { bg: 'linear-gradient(135deg, #84cc16, #4d7c0f)', cor: '#fff' },
  'Sociologia': { bg: 'linear-gradient(135deg, #ec4899, #be185d)', cor: '#fff' },
  'Arte':       { bg: 'linear-gradient(135deg, #8b5cf6, #5b21b6)', cor: '#fff' },
  'Ed. Física': { bg: 'linear-gradient(135deg, #14b8a6, #0e7490)', cor: '#fff' },
}

function corDisciplina(disc) {
  if (COR_DISCIPLINA[disc]) return COR_DISCIPLINA[disc]
  const nome = NOMES_DISCIPLINA[disc]
  if (nome && COR_DISCIPLINA[nome]) return COR_DISCIPLINA[nome]
  return { bg: 'linear-gradient(135deg, #a78bfa, #7c3aed)', cor: '#fff' }
}

function nomeDisciplina(disc) {
  return NOMES_DISCIPLINA[disc] || disc
}

function primeiroDiaComAula(aulas, diaAtual) {
  if (aulas.some((aula) => aula.dia === DIA_LABEL[diaAtual])) return diaAtual
  return DIAS.find((dia) => aulas.some((aula) => aula.dia === DIA_LABEL[dia])) || diaAtual
}

function formatarData(diaSemana) {
  const hoje = new Date()
  const opcoes = { day: '2-digit', month: 'long', year: 'numeric' }
  const dataFormatada = hoje.toLocaleDateString('pt-BR', opcoes)
  return `${dataFormatada} – ${DIA_LABEL_COMPLETO[diaSemana]}`
}

function agruparPorPeriodo(aulas) {
  const grupos = {
    Matutino:   [],
    Vespertino: [],
    Noturno:    [],
  }
  aulas.forEach((aula) => {
    const p = (aula.periodo || '').toLowerCase()
    if (p.includes('matu') || p.includes('manhã') || p.includes('manha')) {
      grupos.Matutino.push(aula)
    } else if (p.includes('vesp') || p.includes('tarde')) {
      grupos.Vespertino.push(aula)
    } else if (p.includes('notu') || p.includes('noite')) {
      grupos.Noturno.push(aula)
    } else {
      grupos.Matutino.push(aula)
    }
  })
  return grupos
}

export default function Cronogramas({
  uid,
  professor,
  cronogramasIniciais = [],
  cronogramasCarregados = false,
  onCronogramasAtualizados = () => {},
}) {
  const [diaAtivo, setDiaAtivo] = useState(() => DIAS[new Date().getDay()])
  const [cronograma, setCronograma] = useState(() => cronogramasIniciais)
  const [loading, setLoading] = useState(() => !cronogramasCarregados)
  const [status, setStatus] = useState(() =>
    cronogramasCarregados && cronogramasIniciais.length === 0 ? MENSAGEM_SEM_HORARIO : ''
  )

  useEffect(() => {
    if (!uid) return

    if (cronogramasCarregados) {
      setCronograma(cronogramasIniciais)
      setStatus(cronogramasIniciais.length === 0 ? MENSAGEM_SEM_HORARIO : '')
      setLoading(false)

      if (cronogramasIniciais.length > 0) {
        setDiaAtivo((diaAtual) => primeiroDiaComAula(cronogramasIniciais, diaAtual))
      }

      return
    }

    carregarCronograma()
  }, [uid, professor, cronogramasIniciais, cronogramasCarregados])

  async function carregarCronograma() {
    setLoading(true)
    setStatus('')

    try {
      const aulas = await buscarCronograma(uid, professor)

      if (aulas.length === 0) {
        setCronograma([])
        onCronogramasAtualizados([])
        setStatus(MENSAGEM_SEM_HORARIO)
        setLoading(false)
        return
      }

      setCronograma(aulas)
      onCronogramasAtualizados(aulas)
      setDiaAtivo((diaAtual) => primeiroDiaComAula(aulas, diaAtual))
    } catch (err) {
      console.error('Erro ao buscar cronograma:', err)
      setCronograma([])
      setStatus('Erro ao carregar o cronograma. Tente novamente.')
    }

    setLoading(false)
  }

  const aulasDoDia = cronograma
    .filter((a) => a.dia === DIA_LABEL[diaAtivo])
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  const periodos = agruparPorPeriodo(aulasDoDia)

  return (
    <div className='crono-card'>
      <h2 className='crono-titulo'>Cronogramas</h2>

      {/* Seletor de dias */}
      <div className='crono-dias'>
        {DIAS.map((dia) => {
          const temAula = cronograma.some((a) => a.dia === DIA_LABEL[dia])
          return (
            <button
              key={dia}
              className={`crono-dia-btn ${diaAtivo === dia ? 'ativo' : ''} ${!temAula ? 'sem-aula' : ''}`}
              onClick={() => setDiaAtivo(dia)}
            >
              {dia}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className='crono-vazia'>Carregando horário...</p>
      ) : status ? (
        <div className='crono-vazia'>
          <p>{status}</p>
        </div>
      ) : (
        <>
          {/* Data atual */}
          <p className='crono-data'>{formatarData(diaAtivo)}</p>

          {/* Períodos */}
          {Object.entries(periodos).map(([nomePeriodo, aulasGrupo]) => (
            <div key={nomePeriodo} className='crono-periodo-bloco'>
              <h3 className='crono-periodo-titulo'>
                Período {nomePeriodo}
                {aulasGrupo.length > 0
                  ? ` – ${aulasGrupo.length} aula${aulasGrupo.length > 1 ? 's' : ''}`
                  : ' – Sem aulas'}
              </h3>

              {aulasGrupo.length > 0 && (
                <div className='crono-lista'>
                  {aulasGrupo.map((aula, i) => {
                    const disc = nomeDisciplina(aula.disciplina)
                    const semGrade = !aula.disciplina || aula.disciplina.trim() === ''
                    const { bg, cor } = corDisciplina(disc)
                    const primeiraLinha = i === 0

                    return (
                      <div key={i} className='crono-pill-row'>
                        {/* Número da aula */}
                        <span className='crono-pill-ordem'>{aula.ordem}ª aula</span>

                        {/* Coluna: Disciplina */}
                        <div className='crono-pill-col'>
                          {primeiraLinha && <span className='crono-pill-label'>Disciplina ministrada</span>}
                          {semGrade ? (
                            <span className='crono-pill-sem-grade'>Sem grade</span>
                          ) : (
                            <span
                              className='crono-pill-disc'
                              style={{ background: bg, color: cor }}
                            >
                              {disc}
                            </span>
                          )}
                        </div>

                        {/* Coluna: Turma */}
                        <div className='crono-pill-col'>
                          {primeiraLinha && <span className='crono-pill-label'>Turma</span>}
                          <span className='crono-pill-turma'>
                            {aula.turma || '—'}
                          </span>
                        </div>

                        {/* Coluna: Sala */}
                        <div className='crono-pill-col'>
                          {primeiraLinha && <span className='crono-pill-label'>Sala</span>}
                          <span className='crono-pill-sala'>
                            {aula.sala || '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}