// src/secoes/Cronogramas.jsx
import { useState, useEffect } from 'react'
import { buscarCronograma } from '../firebase/estrutura'
import '../dashboard/dashboard.css'
import './secoes.css'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

const DIA_LABEL = {
  DOM: 'Domingo',
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
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
  'Matemática':  { bg: '#fce4ec', cor: '#880e4f' },
  'Física':      { bg: '#e3f2fd', cor: '#0d47a1' },
  'Química':     { bg: '#e8f5e9', cor: '#1b5e20' },
  'Biologia':    { bg: '#f3e5f5', cor: '#4a148c' },
  'Português':   { bg: '#fff3e0', cor: '#e65100' },
  'Inglês':      { bg: '#e0f7fa', cor: '#006064' },
  'História':    { bg: '#fbe9e7', cor: '#bf360c' },
  'Geografia':   { bg: '#e8eaf6', cor: '#1a237e' },
  'Filosofia':   { bg: '#f9fbe7', cor: '#33691e' },
  'Sociologia':  { bg: '#fce4ec', cor: '#880e4f' },
  'Arte':        { bg: '#ede7f6', cor: '#311b92' },
  'Ed. Física':  { bg: '#e1f5fe', cor: '#01579b' },
}

function corDisciplina(disc) {
  if (COR_DISCIPLINA[disc]) return COR_DISCIPLINA[disc]
  const nome = NOMES_DISCIPLINA[disc]
  if (nome && COR_DISCIPLINA[nome]) return COR_DISCIPLINA[nome]
  return { bg: '#f3f0f9', cor: '#6F3B9D' }
}

export default function Cronogramas({ uid, professor }) {
  const [diaAtivo, setDiaAtivo] = useState(() => DIAS[new Date().getDay()])
  const [cronograma, setCronograma] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

async function carregarCronograma() {
  if (!uid) return

  setLoading(true)
  setStatus('')

  try {
    const aulas = await buscarCronograma(uid, professor)

    if (aulas.length === 0) {
      setCronograma([])
      setStatus('Nenhum horÃ¡rio encontrado. Aguarde o coordenador fazer o upload do PDF.')
      setLoading(false)
      return
    }

    setCronograma(aulas)
    setLoading(false)
    return
  } catch (err) {
    console.error('Erro ao buscar cronograma:', err)
    setCronograma([])
    setStatus('Erro ao carregar o cronograma. Tente novamente.')
    setLoading(false)
    return
  }

/*
  try {
    // Busca os nomes das turmas via turmas_periodo (já funciona para professores)
    const turmasPeriodoSnap = await getDocs(collection(db, 'turmas_periodo'))

    if (turmasPeriodoSnap.empty) {
      setStatus('Nenhum horário encontrado. Aguarde o coordenador fazer o upload do PDF.')
      setLoading(false)
      return
    }

    // Pega nomes únicos de turmas
    const nomesTurmas = [...new Set(
      turmasPeriodoSnap.docs.map(d => d.data().nomeTurma).filter(Boolean)
    )]

    console.log('Turmas do período:', nomesTurmas)

    const todasAulas = []

    await Promise.all(
      nomesTurmas.map(async (nomeTurma) => {
        try {
          const aulasSnap = await getDocs(
            collection(db, 'cronogramas_escola', nomeTurma, 'aulas')
          )
          aulasSnap.docs.forEach(d => {
            todasAulas.push({ id: d.id, ...d.data() })
          })
        } catch (e) {
          console.warn('Sem aulas para turma:', nomeTurma, e)
        }
      })
    )

    console.log('Total de aulas:', todasAulas.length)

    if (todasAulas.length === 0) {
      setStatus('Nenhum horário encontrado. Aguarde o coordenador fazer o upload do PDF.')
      setLoading(false)
      return
    }

    setCronograma(todasAulas)
  } catch (err) {
    console.error('Erro ao buscar cronograma:', err)
    setStatus('Erro ao carregar o cronograma. Tente novamente.')
  }

  setLoading(false)
*/
}
  useEffect(() => {
    carregarCronograma()
  }, [uid, professor])

  const aulasDoDia = cronograma
    .filter(a => a.dia === DIA_LABEL[diaAtivo])
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  return (
    <div className='card'>
      <div className='card-titulo'>Cronograma semanal</div>

      {loading ? (
        <p className='secao-vazia'>Carregando horário...</p>
      ) : status ? (
        <div className='secao-vazia' style={{ padding: '28px 0' }}>
          <p>{status}</p>
        </div>
      ) : (
        <>
          <div className='dia-seletor'>
            {DIAS.map(dia => (
              <button
                key={dia}
                className={`dia-btn ${diaAtivo === dia ? 'ativo' : ''}`}
                onClick={() => setDiaAtivo(dia)}
              >
                {dia}
              </button>
            ))}
          </div>

          {aulasDoDia.length === 0 ? (
            <p className='secao-vazia'>Sem aulas neste dia.</p>
          ) : (
            aulasDoDia.map((aula, i) => {
              const { bg, cor } = corDisciplina(aula.disciplina)
              return (
                <div key={i} className='aula-linha'>
                  <span className='aula-num'>{aula.ordem}ª aula</span>
                  <span className='aula-disc' style={{ background: bg, color: cor }}>
                    {NOMES_DISCIPLINA[aula.disciplina] || aula.disciplina}
                  </span>
                  <span className='aula-turma'>{aula.turma}</span>
                  <span className='aula-sala'>
                    {aula.sala ? `Sala ${aula.sala}` : ''}
                  </span>
                </div>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
