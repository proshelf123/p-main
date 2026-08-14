// src/secoes/Cronogramas.jsx
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Plus, Save, Trash2, PencilLine, AlertTriangle } from 'lucide-react'
import {
  buscarCronograma,
  buscarProfessores,
  deletarCronogramaCursoManual,
  escutarProfessoresDisciplinas,
  salvarCronogramaTurmaManual,
} from '../firebase/estrutura'
import DropdownComPortal from './DropwdownComPortal'
import useCoresDisciplinas from '../hooks/useCoresDisciplinas'
import { montarGradienteDisciplina } from './coresDisciplinas'
import {
  listarDisciplinasComCor,
  montarOpcoesProfessoresDisciplina,
  professorPadraoDisciplina,
} from './vinculosDisciplinas'
import '../dashboard/dashboard.css'
import './secoes.css'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const MENSAGEM_SEM_HORARIO = 'Nenhum cronograma encontrado. Aguarde o coordenador cadastrar as aulas.'
const ANOS_CURSO = ['1', '2', '3']
const ANOS_CURSO_LABEL = ANOS_CURSO.map((ano) => `${ano}° ano`)
const PERIODOS_EDITOR = ['Matutino', 'Vespertino', 'Noturno']
const FORM_CURSO_INICIAL = { curso: '', ano: '1', periodo: 'Matutino' }
const DIAS_EDITOR_CHAVES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const DIAS_EDITOR = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const CURSOS_CRONOGRAMA = {
  RH: 'Recursos Humanos',
  DS: 'Desenvolvimento de Sistemas',
  INFONET: 'Informática para Internet',
}

const TRANSICAO_CRONOGRAMA = {
  duration: 0.22,
  ease: 'easeOut',
}

const ANIMACAO_PAINEL = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: TRANSICAO_CRONOGRAMA,
}

const ANIMACAO_CARD_CURSO = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
}

const MotionDiv = motion.div

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

function novaAulaEditor(ordem = 1, dia = 'Segunda') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    dia,
    ordem,
    horario: '',
    periodo: 'Matutino',
    disciplina: '',
    professor: '',
    sala: '',
    dividida: false,
    A: { disciplina: '', professor: '', sala: '' },
    B: { disciplina: '', professor: '', sala: '' },
  }
}

function aulasEditorIniciais() {
  return [novaAulaEditor(1)]
}

function proximaOrdemAulaDia(aulas = [], dia = 'Segunda') {
  const ordens = aulas
    .filter((aula) => aula.dia === dia)
    .map((aula) => Number(aula.ordem || 0))

  return Math.max(0, ...ordens) + 1
}

function reordenarAulasDoDia(aulas = [], dia = 'Segunda') {
  let ordem = 1
  return aulas.map((aula) => (
    aula.dia === dia ? { ...aula, ordem: ordem++ } : aula
  ))
}

const NOMES_DISCIPLINA = {
  MAT: 'Matemática', FIS: 'Física', QUI: 'Química',
  BIO: 'Biologia', PORT: 'Português', ING: 'Inglês',
  HIS: 'História', GEO: 'Geografia', FIL: 'Filosofia',
  SOCI: 'Sociologia', ARTE: 'Artes',
  'ED. FIS': 'Ed. Física', 'ED.FIS': 'Ed. Física',
}

function ModalConfirmarCurso({ curso, onConfirmar, onCancelar, deletando = false }) {
  return (
    <>
      <div className='modal-confirmar-overlay' onClick={deletando ? undefined : onCancelar} />
      <div className='modal-confirmar'>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <AlertTriangle size={26} color='#ED235C' strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover curso?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Voce esta prestes a remover o curso
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: '#FFF0F3', margin: '0 0 6px',
          animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ED235C', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ED235C' }}>{curso?.cursoNome}</div>
            <div style={{ fontSize: 11, color: '#ED235C', opacity: 0.7 }}>{curso?.id}</div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Todas as aulas cadastradas neste curso serao removidas permanentemente.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            disabled={deletando}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--borda)', background: 'var(--branco)',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              color: 'var(--texto)', cursor: deletando ? 'wait' : 'pointer',
              transition: 'all .15s', opacity: deletando ? 0.65 : 1,
            }}
            onMouseEnter={e => { if (!deletando) { e.currentTarget.style.borderColor = 'var(--roxo)'; e.currentTarget.style.color = 'var(--roxo)' } }}
            onMouseLeave={e => { if (!deletando) { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#555' } }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={deletando}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: '#ED235C',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              fontWeight: 600, color: '#fff', cursor: deletando ? 'wait' : 'pointer',
              transition: 'all .15s', opacity: deletando ? 0.75 : 1,
            }}
            onMouseEnter={e => { if (!deletando) { e.currentTarget.style.background = '#c71b4d'; e.currentTarget.style.transform = 'scale(1.02)' } }}
            onMouseLeave={e => { if (!deletando) { e.currentTarget.style.background = '#ED235C'; e.currentTarget.style.transform = 'scale(1)' } }}
          >
            {deletando ? 'Removendo...' : 'Sim, remover'}
          </button>
        </div>
      </div>
    </>
  )
}

function ModalConfirmarAula({ aula, onConfirmar, onCancelar, coresDisciplinas }) {
  const discPrincipal = aula?.dividida ? (aula?.A?.disciplina || aula?.B?.disciplina) : aula?.disciplina;
  const gradeCores = corDisciplina(nomeDisciplina(discPrincipal), coresDisciplinas);
  const bg = gradeCores?.bg || '#FFF0F3';
  const cor = gradeCores?.cor || '#ED235C';
  
  const ordemLabel = aula?.ordem ? `${aula.ordem}ª Aula` : 'Aula';
  const horarioLabel = aula?.horario ? `(${formatarHorarioCurto(aula.horario)})` : '';
  const discLabel = aula?.dividida ? 'Turma Dividida (A/B)' : (aula?.disciplina || 'Sem disciplina');

  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onCancelar} />
      <div className='modal-confirmar'>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <AlertTriangle size={26} color='#ED235C' strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover aula?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a remover esta aula da grade
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: bg, margin: '0 0 6px',
          animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: cor }}>
              {ordemLabel} {horarioLabel}
            </div>
            <div style={{ fontSize: 11, color: cor, opacity: 0.8 }}>
              {discLabel}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Esta ação removerá a linha imediatamente do seu rascunho.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid var(--borda)', background: 'var(--branco)',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              color: 'var(--texto)', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--roxo)'; e.currentTarget.style.color = 'var(--roxo)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--borda)'; e.currentTarget.style.color = 'var(--texto-sec)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: '#ED235C',
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all .15s'
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

function corDisciplina(disc, coresCustomizadas = {}) {
  return montarGradienteDisciplina(disc, coresCustomizadas)
}

function nomeDisciplina(disc) {
  return NOMES_DISCIPLINA[disc] || disc
}

function normalizarTextoCronograma(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function chaveRascunhoCronograma(uid) {
  return uid ? `proshelf:cronograma-editor:${uid}` : ''
}

function carregarRascunhoCronograma(uid) {
  const chave = chaveRascunhoCronograma(uid)
  if (!chave || typeof window === 'undefined') return null

  try {
    const salvo = window.localStorage.getItem(chave)
    return salvo ? JSON.parse(salvo) : null
  } catch (err) {
    console.warn('Rascunho de cronograma invalido:', err)
    return null
  }
}

function salvarRascunhoCronograma(uid, rascunho) {
  const chave = chaveRascunhoCronograma(uid)
  if (!chave || typeof window === 'undefined') return
  window.localStorage.setItem(chave, JSON.stringify(rascunho))
}

function limparRascunhoCronograma(uid) {
  const chave = chaveRascunhoCronograma(uid)
  if (!chave || typeof window === 'undefined') return
  window.localStorage.removeItem(chave)
}

function turmaBaseCronograma(turma) {
  const nome = normalizarTextoCronograma(turma)
  return nome.replace(/\s+[AB]$/, '')
}

function dadosCursoDaTurma(turma) {
  const nomeBase = turmaBaseCronograma(turma)
  const partes = nomeBase.match(/^(\d+)\s+(.+)$/)
  if (!partes) {
    return {
      id: nomeBase || 'SEM_TURMA',
      ano: '',
      cursoSigla: nomeBase || 'Sem turma',
      cursoNome: nomeBase || 'Sem turma',
      titulo: nomeBase || 'Sem turma',
    }
  }

  const ano = partes[1]
  const cursoSigla = partes[2]
  const cursoNome = CURSOS_CRONOGRAMA[cursoSigla] || cursoSigla

  return {
    id: nomeBase,
    ano,
    cursoSigla,
    cursoNome,
    titulo: `${ano}º ${cursoNome}`,
  }
}

function formCursoDoCurso(curso) {
  const primeiraAula = curso?.aulas?.find((aula) => aula.periodo)

  return {
    curso: curso?.cursoSigla || curso?.cursoNome || '',
    ano: curso?.ano || '1',
    periodo: primeiraAula?.periodo || 'Matutino',
  }
}

function chaveLinhaEditor(aula) {
  return [
    aula.dia || 'Segunda',
    aula.ordem || 1,
    aula.horario || '',
    aula.periodo || 'Matutino',
  ].map(normalizarTextoCronograma).join('|')
}

function divisaoDaAula(aula) {
  const divisao = normalizarTextoCronograma(aula.divisao)
  if (divisao === 'A' || divisao === 'B') return divisao

  const turma = normalizarTextoCronograma(aula.turma)
  const match = turma.match(/\s([AB])$/)
  return match?.[1] || ''
}

function montarAulasEditorDoCurso(aulas = []) {
  if (!Array.isArray(aulas) || aulas.length === 0) return aulasEditorIniciais()

  const linhas = []
  const divididas = new Map()

  aulas
    .slice()
    .sort((a, b) => {
      const dia = String(a.dia || '').localeCompare(String(b.dia || ''), 'pt-BR')
      return dia || Number(a.ordem || 0) - Number(b.ordem || 0)
    })
    .forEach((aula) => {
      const divisao = divisaoDaAula(aula)

      if (divisao) {
        const chave = chaveLinhaEditor(aula)
        if (!divididas.has(chave)) {
          divididas.set(chave, {
            ...novaAulaEditor(aula.ordem || 1),
            dia: aula.dia || 'Segunda',
            horario: aula.horario || '',
            periodo: aula.periodo || 'Matutino',
            dividida: true,
          })
        }

        const linha = divididas.get(chave)
        linha[divisao] = {
          disciplina: aula.disciplina || '',
          professor: aula.professor || '',
          sala: aula.sala || '',
        }
        return
      }

      linhas.push({
        ...novaAulaEditor(aula.ordem || linhas.length + 1),
        dia: aula.dia || 'Segunda',
        horario: aula.horario || '',
        periodo: aula.periodo || 'Matutino',
        disciplina: aula.disciplina || '',
        professor: aula.professor || '',
        sala: aula.sala || '',
      })
    })

  const todas = [...linhas, ...divididas.values()]
    .sort((a, b) => String(a.dia || '').localeCompare(String(b.dia || ''), 'pt-BR') || Number(a.ordem || 0) - Number(b.ordem || 0))

  return todas.length > 0 ? todas : aulasEditorIniciais()
}

function agruparPorCurso(aulas) {
  const mapa = new Map()

  aulas.forEach((aula) => {
    const curso = dadosCursoDaTurma(aula.turma)
    if (!mapa.has(curso.id)) {
      mapa.set(curso.id, {
        ...curso,
        aulas: [],
        professores: new Set(),
        dias: new Set(),
      })
    }

    const grupo = mapa.get(curso.id)
    grupo.aulas.push(aula)
    if (aula.professor) grupo.professores.add(normalizarTextoCronograma(aula.professor))
    if (aula.dia) grupo.dias.add(aula.dia)
  })

  return [...mapa.values()].sort((a, b) => {
    const anoA = Number(a.ano || 99)
    const anoB = Number(b.ano || 99)
    return anoA - anoB || a.cursoNome.localeCompare(b.cursoNome, 'pt-BR')
  })
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

function formatarHorarioCurto(horario) {
  const texto = String(horario || '').trim()
  const match = texto.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return texto

  const hora = Number(match[1])
  const minutos = match[2]
  return minutos === '00' ? `${hora}h` : `${hora}h${minutos}`
}

function rotuloAulaComHorario(aula) {
  const ordem = aula.ordem ? `${aula.ordem}ª aula` : 'Aula'
  const horario = formatarHorarioCurto(aula.horario)
  return horario ? `${ordem} (${horario})` : ordem
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
  const [cursoSelecionado, setCursoSelecionado] = useState(null)
  const [loading, setLoading] = useState(() => !cronogramasCarregados)
  const [status, setStatus] = useState(() =>
    cronogramasCarregados && cronogramasIniciais.length === 0 ? MENSAGEM_SEM_HORARIO : ''
  )
  const [abaEditor, setAbaEditor] = useState('curso')
  const [formCurso, setFormCurso] = useState(FORM_CURSO_INICIAL)
  const [aulasEditor, setAulasEditor] = useState(aulasEditorIniciais)
  const [rascunhoEditorCarregado, setRascunhoEditorCarregado] = useState(false)
  const [professoresEditor, setProfessoresEditor] = useState([])
  const [professoresDisciplinas, setProfessoresDisciplinas] = useState({})
  const [salvandoEditor, setSalvandoEditor] = useState(false)
  
  // Estado para exclusão do CURSO (já existente)
  const [deletandoCursoId, setDeletandoCursoId] = useState('')
  const [confirmarDeleteCurso, setConfirmarDeleteCurso] = useState(null)

  // NOVO: Estado para exclusão de uma AULA da grade
  const [confirmarDeleteAulaIndex, setConfirmarDeleteAulaIndex] = useState(null)

  const [erroEditor, setErroEditor] = useState('')
  const [sucessoEditor, setSucessoEditor] = useState('')
  const [dropdownEditorAberto, setDropdownEditorAberto] = useState(null)
  const coresDisciplinas = useCoresDisciplinas()

  const isCoordenador = professor?.role === 'coordenador'

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

  useEffect(() => {
    if (!isCoordenador) return

    buscarProfessores()
      .then(setProfessoresEditor)
      .catch((err) => {
        console.error('Erro ao carregar professores para cronograma:', err)
        setProfessoresEditor([])
      })
  }, [isCoordenador])

  useEffect(() => {
    if (!isCoordenador) return

    return escutarProfessoresDisciplinas(
      setProfessoresDisciplinas,
      (err) => {
        console.error('Erro ao carregar professores por disciplina:', err)
        setProfessoresDisciplinas({})
      }
    )
  }, [isCoordenador])

  useEffect(() => {
    if (!uid || !isCoordenador) {
      setRascunhoEditorCarregado(true)
      return
    }

    const rascunho = carregarRascunhoCronograma(uid)
    if (rascunho?.formCurso) {
      setFormCurso({ ...FORM_CURSO_INICIAL, ...rascunho.formCurso })
    }
    if (Array.isArray(rascunho?.aulasEditor) && rascunho.aulasEditor.length > 0) {
      setAulasEditor(rascunho.aulasEditor)
    }
    if (rascunho?.abaEditor === 'grade' && rascunho?.formCurso?.curso) {
      setAbaEditor('grade')
    }

    setRascunhoEditorCarregado(true)
  }, [uid, isCoordenador])

  const editorTemRascunhoAtual = Boolean(
    formCurso.curso.trim()
    || abaEditor === 'grade'
    || aulasEditor.some((aula) => {
      if (aula.dividida) {
        return ['A', 'B'].some((grupo) => (
          aula[grupo].disciplina || aula[grupo].professor || aula[grupo].sala
        )) || aula.horario
      }

      return aula.disciplina || aula.professor || aula.sala || aula.horario
    })
  )

  useEffect(() => {
    if (!uid || !isCoordenador || !rascunhoEditorCarregado) return

    if (!editorTemRascunhoAtual) {
      limparRascunhoCronograma(uid)
      return
    }

    salvarRascunhoCronograma(uid, {
      abaEditor,
      formCurso,
      aulasEditor,
      atualizadoEm: new Date().toISOString(),
    })
  }, [uid, isCoordenador, rascunhoEditorCarregado, editorTemRascunhoAtual, abaEditor, formCurso, aulasEditor])

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

  const cursos = agruparPorCurso(cronograma)
  const aulasCursoSelecionado = cursoSelecionado
    ? cronograma.filter((aula) => turmaBaseCronograma(aula.turma) === cursoSelecionado.id)
    : []

  const aulasVisiveis = cursoSelecionado ? aulasCursoSelecionado : cronograma

  const aulasDoDia = aulasVisiveis
    .filter((a) => a.dia === DIA_LABEL[diaAtivo])
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  const periodos = agruparPorPeriodo(aulasDoDia)
  const diaEditorAtivo = DIAS_EDITOR.includes(DIA_LABEL[diaAtivo])
    ? DIA_LABEL[diaAtivo]
    : 'Segunda'
  
  // Mapeamos armazenando o INDEX real da aula em "aulasEditor", para usarmos ao deletar
  const aulasEditorDoDia = aulasEditor
    .map((aula, index) => ({ aula, index }))
    .filter(({ aula }) => aula.dia === diaEditorAtivo)

  useEffect(() => {
    if (!isCoordenador || abaEditor !== 'grade') return

    setAulasEditor((atuais) => (
      atuais.some((aula) => aula.dia === diaEditorAtivo)
        ? atuais
        : [...atuais, novaAulaEditor(proximaOrdemAulaDia(atuais, diaEditorAtivo), diaEditorAtivo)]
    ))
  }, [isCoordenador, abaEditor, diaEditorAtivo])

  function abrirCurso(curso) {
    if (deletandoCursoId) return
    setCursoSelecionado(curso)
    setFormCurso(formCursoDoCurso(curso))
    setAulasEditor(montarAulasEditorDoCurso(curso.aulas))
    setAbaEditor('grade')
    setErroEditor('')
    setSucessoEditor('')
    setDiaAtivo((diaAtual) => primeiroDiaComAula(curso.aulas, diaAtual))
  }

  function abrirCursoPeloTeclado(event, curso) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    abrirCurso(curso)
  }

  function voltarParaCursos() {
    if (cursoSelecionado) {
      setFormCurso(FORM_CURSO_INICIAL)
      setAulasEditor(aulasEditorIniciais())
    }
    setCursoSelecionado(null)
    setAbaEditor('curso')
    setDiaAtivo((diaAtual) => primeiroDiaComAula(cronograma, diaAtual))
  }

  function nomeTurmaEditor() {
    const curso = normalizarTextoCronograma(formCurso.curso)
    return curso ? `${formCurso.ano} ${curso}` : ''
  }

  function atualizarFormCurso(campo, valor) {
    setFormCurso((atual) => ({ ...atual, [campo]: valor }))
    setErroEditor('')
    setSucessoEditor('')
  }

  function avancarParaGrade() {
    if (!formCurso.curso.trim()) {
      setErroEditor('Informe o nome do curso para montar o cronograma.')
      return
    }

    setErroEditor('')
    setSucessoEditor('')
    if (!DIAS_EDITOR_CHAVES.includes(diaAtivo)) setDiaAtivo('SEG')
    setAbaEditor('grade')
  }

  function atualizarAulaEditor(index, campo, valor) {
    setAulasEditor((atuais) => atuais.map((aula, i) => (
      i === index ? { ...aula, [campo]: valor } : aula
    )))
    setErroEditor('')
    setSucessoEditor('')
  }

  function atualizarAulaDividida(index, grupo, campo, valor) {
    setAulasEditor((atuais) => atuais.map((aula, i) => (
      i === index
        ? { ...aula, [grupo]: { ...aula[grupo], [campo]: valor } }
        : aula
    )))
    setErroEditor('')
    setSucessoEditor('')
  }

  function adicionarLinhaAula() {
    setAulasEditor((atuais) => [
      ...atuais,
      novaAulaEditor(proximaOrdemAulaDia(atuais, diaEditorAtivo), diaEditorAtivo),
    ])
    setErroEditor('')
    setSucessoEditor('')
  }

  function removerLinhaAula(index) {
    setAulasEditor((atuais) => {
      const aulaRemovida = atuais[index]
      const dia = aulaRemovida?.dia || diaEditorAtivo
      const aulasDoDiaAtual = atuais.filter((aula) => aula.dia === dia)

      if (aulasDoDiaAtual.length <= 1) {
        return atuais.map((aula, i) => (
          i === index ? novaAulaEditor(1, dia) : aula
        ))
      }

      return reordenarAulasDoDia(atuais.filter((_, i) => i !== index), dia)
    })
    setErroEditor('')
    setSucessoEditor('')
  }

  function aulaTemConteudo(aula) {
    if (aula.dividida) {
      return ['A', 'B'].some((grupo) => (
        aula[grupo].disciplina || aula[grupo].professor || aula[grupo].sala
      )) || aula.horario
    }

    return aula.disciplina || aula.professor || aula.sala || aula.horario
  }

  function professorOpcoes() {
    return professoresEditor.map((professorItem) => {
      const valor = professorItem.nome || ''
      const label = professorItem.nome
      return { valor, label }
    })
      .filter((item) => item.valor)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }

  function opcoesDisciplinasEditor(valorAtual = '') {
    const disciplinasCadastradas = listarDisciplinasComCor(coresDisciplinas)
    const opcoes = disciplinasCadastradas.map((disciplina) => ({
      valor: disciplina,
      label: disciplina,
    }))

    if (valorAtual && !opcoes.some((opcao) => normalizarTextoCronograma(opcao.valor) === normalizarTextoCronograma(valorAtual))) {
      opcoes.push({ valor: valorAtual, label: valorAtual })
    }

    return [
      { valor: '', label: 'Selecione a disciplina' },
      ...opcoes.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    ]
  }

  function opcoesProfessoresDaAula(disciplina, rotuloSemProfessor = 'Sem professor') {
    const vinculados = montarOpcoesProfessoresDisciplina(disciplina, professoresDisciplinas, {
      incluirSemProfessor: true,
      rotuloSemProfessor,
    })

    if (vinculados.length > 1) return vinculados

    return [
      { valor: '', label: rotuloSemProfessor },
      ...professorOpcoes(),
    ]
  }

  function opcoesProfessoresComValor(disciplina, valorAtual = '', rotuloSemProfessor = 'Sem professor') {
    const opcoes = opcoesProfessoresDaAula(disciplina, rotuloSemProfessor)

    if (valorAtual && !opcoes.some((opcao) => opcao.valor === valorAtual || opcao.label === valorAtual)) {
      return [...opcoes, { valor: valorAtual, label: valorAtual }]
    }

    return opcoes
  }

  function professorVinculadoDisciplina(disciplina, grupo = '') {
    return professorPadraoDisciplina(disciplina, professoresDisciplinas, grupo)
  }

  function atualizarDisciplinaAula(index, valor) {
    const professorVinculado = professorVinculadoDisciplina(valor)
    setAulasEditor((atuais) => atuais.map((aula, i) => (
      i === index
        ? {
          ...aula,
          disciplina: valor,
          professor: professorVinculado,
        }
        : aula
    )))
    setErroEditor('')
    setSucessoEditor('')
  }

  function atualizarDisciplinaDividida(index, grupo, valor) {
    const professorVinculado = professorVinculadoDisciplina(valor, grupo)
    setAulasEditor((atuais) => atuais.map((aula, i) => {
      if (i !== index) return aula

      return {
        ...aula,
        [grupo]: {
          ...aula[grupo],
          disciplina: valor,
          professor: professorVinculado,
        },
      }
    }))
    setErroEditor('')
    setSucessoEditor('')
  }

  function montarAulasParaSalvar() {
    const turmaBase = nomeTurmaEditor()
    const aulasValidas = []

    aulasEditor.forEach((aula, index) => {
      if (!aulaTemConteudo(aula)) return

      const ordem = Number(aula.ordem || index + 1)
      if (!aula.horario.trim()) {
        throw new Error(`Informe o horário da ${ordem}ª aula.`)
      }

      if (aula.dividida) {
        ;['A', 'B'].forEach((grupo) => {
          const dadosGrupo = aula[grupo]
          if (!dadosGrupo.disciplina && !dadosGrupo.professor && !dadosGrupo.sala) return
          if (!dadosGrupo.disciplina.trim()) {
            throw new Error(`Informe a disciplina da turma ${grupo} na ${ordem}ª aula.`)
          }

          aulasValidas.push({
            dia: aula.dia,
            ordem,
            horario: aula.horario,
            periodo: aula.periodo,
            disciplina: dadosGrupo.disciplina.trim(),
            professor: dadosGrupo.professor.trim(),
            sala: dadosGrupo.sala.trim(),
            turma: `${turmaBase} ${grupo}`,
            divisao: grupo,
          })
        })
        return
      }

      if (!aula.disciplina.trim()) {
        throw new Error(`Informe a disciplina da ${ordem}ª aula.`)
      }

      aulasValidas.push({
        dia: aula.dia,
        ordem,
        horario: aula.horario,
        periodo: aula.periodo,
        disciplina: aula.disciplina.trim(),
        professor: aula.professor.trim(),
        sala: aula.sala.trim(),
        turma: turmaBase,
        divisao: '',
      })
    })

    if (aulasValidas.length === 0) {
      throw new Error('Adicione pelo menos uma aula antes de salvar.')
    }

    return aulasValidas
  }

  async function salvarEditorCronograma() {
    if (!isCoordenador || salvandoEditor) return

    try {
      setSalvandoEditor(true)
      setErroEditor('')
      setSucessoEditor('')

      const aulasParaSalvar = montarAulasParaSalvar()
      await salvarCronogramaTurmaManual({
        uid,
        curso: formCurso.curso.trim(),
        ano: formCurso.ano,
        nomeTurma: nomeTurmaEditor(),
        periodo: formCurso.periodo,
        aulas: aulasParaSalvar,
      })

      await carregarCronograma()
      limparRascunhoCronograma(uid)
      setCursoSelecionado(null)
      setAbaEditor('curso')
      setFormCurso(FORM_CURSO_INICIAL)
      setAulasEditor(aulasEditorIniciais())
      setSucessoEditor('Cronograma salvo com sucesso.')
    } catch (err) {
      console.error('Erro ao salvar cronograma manual:', err)
      setErroEditor(err.message || 'Erro ao salvar cronograma.')
    } finally {
      setSalvandoEditor(false)
    }
  }

  function solicitarDeleteCurso(curso, event) {
    event.stopPropagation()
    if (!isCoordenador || deletandoCursoId) return
    setConfirmarDeleteCurso(curso)
  }

  async function executarDeleteCurso() {
    if (!confirmarDeleteCurso || deletandoCursoId) return
    const curso = confirmarDeleteCurso

    try {
      setDeletandoCursoId(curso.id)
      setErroEditor('')
      setSucessoEditor('')

await deletarCronogramaCursoManual({ uid, nomeTurma: curso.id })

      if (normalizarTextoCronograma(nomeTurmaEditor()) === curso.id) {
        limparRascunhoCronograma(uid)
        setFormCurso(FORM_CURSO_INICIAL)
        setAulasEditor(aulasEditorIniciais())
        setAbaEditor('curso')
      }

      setCursoSelecionado(null)
      await carregarCronograma()
      setConfirmarDeleteCurso(null)
      setSucessoEditor('Curso deletado com sucesso.')
    } catch (err) {
      console.error('Erro ao deletar curso do cronograma:', err)
      setErroEditor(err.message || 'Erro ao deletar curso.')
    } finally {
      setDeletandoCursoId('')
    }
  }

  return (
    <div>
      <div className='crono-topo'>
        <div 
          style={{ 
            width: "100%", 
            marginBottom: "32px", 
            paddingBottom: "24px", 
            borderBottom: "1px solid var(--borda)" 
          }}
        >
          <div 
            style={{ 
              paddingLeft: "15px",
              borderLeft: "3px solid var(--roxo)" 
            }}
          >
            <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
              Cronogramas
            </h2>
            <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
              Crie, edite e veja seus cronogramas
            </p>
          </div>
        </div>
      </div>

      {isCoordenador && (
        <section className='crono-editor'>
          <div className='crono-editor-tabs'>
            <button
              type='button'
              className={`crono-editor-tab ${abaEditor === 'curso' ? 'ativo' : ''}`}
              onClick={voltarParaCursos}
            >
              Curso
            </button>
            
            {(cursoSelecionado || abaEditor === 'grade') && (
              <button
                type='button'
                className={`crono-editor-tab ${abaEditor === 'grade' ? 'ativo' : ''}`}
                onClick={avancarParaGrade}
                disabled={!formCurso.curso.trim()}
              >
                Aulas
              </button>
            )}
          </div>

          <AnimatePresence mode='wait'>
            {abaEditor === 'curso' ? (
              <MotionDiv
                key='editor-curso'
                className='crono-editor-curso'
                {...ANIMACAO_PAINEL}
              >
                <label className='crono-editor-campo'>
                  <span>Curso</span>
                  <input
                    value={formCurso.curso}
                    onChange={(e) => atualizarFormCurso('curso', e.target.value)}
                    placeholder='Ex: Recursos Humanos'
                  />
                </label>

                <div className='crono-editor-dropdown'>
                  <DropdownComPortal
                    label='Ano'
                    opcoes={ANOS_CURSO_LABEL}
                    valor={`${formCurso.ano}° ano`}
                    onChange={(valor) => atualizarFormCurso('ano', valor.replace(/\D/g, '') || '1')}
                    id='crono-ano'
                    dropdownAberto={dropdownEditorAberto}
                    setDropdownAberto={setDropdownEditorAberto}
                  />
                </div>

                <div className='crono-editor-dropdown'>
                  <DropdownComPortal
                    label='Período'
                    opcoes={PERIODOS_EDITOR}
                    valor={formCurso.periodo}
                    onChange={(valor) => atualizarFormCurso('periodo', valor)}
                    id='crono-periodo'
                    dropdownAberto={dropdownEditorAberto}
                    setDropdownAberto={setDropdownEditorAberto}
                  />
                </div>

                <button className='crono-editor-acao' onClick={avancarParaGrade}>
                  <PencilLine size={16} />
                  Montar grade
                </button>
              </MotionDiv>
            ) : (
              <MotionDiv
                key='editor-grade'
                className='crono-editor-grade-wrap'
                {...ANIMACAO_PAINEL}
              >
                <div className='crono-editor-grade-topo'>
                  <div>
                    <span className='crono-editor-kicker'>Turma</span>
                    <strong>{nomeTurmaEditor() || cursoSelecionado?.titulo || 'Sem curso'}</strong>
                  </div>

                  <div className='crono-editor-acoes'>
                    <button
                      className='crono-editor-btn secundario'
                      onClick={voltarParaCursos}
                    >
                      <ArrowLeft size={16} />
                      Curso
                    </button>
                    <button className='crono-editor-btn' onClick={adicionarLinhaAula}>
                      <Plus size={16} />
                      Aula
                    </button>
                    <button
                      className='crono-editor-btn salvar'
                      onClick={salvarEditorCronograma}
                      disabled={salvandoEditor}
                    >
                      <Save size={16} />
                      {salvandoEditor ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>

                <div className='crono-editor-dia-tabs'>
                  {DIAS_EDITOR_CHAVES.map((dia) => (
                    <button
                      key={dia}
                      type='button'
                      className={`crono-dia-btn ${DIA_LABEL[dia] === diaEditorAtivo ? 'ativo' : ''}`}
                      onClick={() => setDiaAtivo(dia)}
                    >
                      {dia}
                    </button>
                  ))}
                </div>

                <div className='crono-editor-planilha'>
                  <div className='crono-editor-head'>
                    <span>Aula</span>
                    <span>Horário</span>
                    <span>Período</span>
                    <span>A/B</span>
                    <span>Disciplina</span>
                    <span>Professor</span>
                    <span>Sala</span>
                    <span />
                  </div>

                  {aulasEditorDoDia.map(({ aula, index }) => (
                    <div
                      key={aula.id}
                      className={`crono-editor-row ${aula.dividida ? 'dividida' : ''}`}
                    >
                      <div className="crono-celula" data-label="Aula">
                        <input
                          type='number'
                          min='1'
                          max='9'
                          value={aula.ordem}
                          onChange={(e) => atualizarAulaEditor(index, 'ordem', e.target.value)}
                        />
                      </div>

                      <div className="crono-celula" data-label="Horário">
                        <input
                          type='time'
                          value={aula.horario}
                          onChange={(e) => atualizarAulaEditor(index, 'horario', e.target.value)}
                        />
                      </div>

                      <div className="crono-celula" data-label="Período">
                        <div className='crono-editor-grade-dropdown'>
                          <DropdownComPortal
                            opcoes={PERIODOS_EDITOR}
                            valor={aula.periodo}
                            onChange={(valor) => atualizarAulaEditor(index, 'periodo', valor)}
                            id={`crono-periodo-${aula.id}`}
                            dropdownAberto={dropdownEditorAberto}
                            setDropdownAberto={setDropdownEditorAberto}
                          />
                        </div>
                      </div>

                      <div className="crono-celula" data-label="Turma Dividida (A/B)">
                        <label className='crono-editor-toggle'>
                          <input
                            type='checkbox'
                            checked={aula.dividida}
                            onChange={(e) => atualizarAulaEditor(index, 'dividida', e.target.checked)}
                          />
                          <span>{aula.dividida ? 'Sim (A/B)' : 'Não'}</span>
                        </label>
                      </div>

                      {aula.dividida ? (
                        <>
                          <div className="crono-celula" data-label="Disciplina">
                            <div className='crono-editor-stack'>
                              {['A', 'B'].map((grupo) => (
                                <div key={grupo} className='crono-editor-grade-dropdown'>
                                  <DropdownComPortal
                                    opcoes={opcoesDisciplinasEditor(aula[grupo].disciplina)}
                                    valor={aula[grupo].disciplina}
                                    onChange={(valor) => atualizarDisciplinaDividida(index, grupo, valor)}
                                    id={`crono-disc-${grupo}-${aula.id}`}
                                    dropdownAberto={dropdownEditorAberto}
                                    setDropdownAberto={setDropdownEditorAberto}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="crono-celula" data-label="Professor">
                            <div className='crono-editor-stack'>
                              {['A', 'B'].map((grupo) => (
                                <div key={grupo} className='crono-editor-grade-dropdown'>
                                  <DropdownComPortal
                                    opcoes={opcoesProfessoresComValor(
                                      aula[grupo].disciplina,
                                      aula[grupo].professor,
                                      `Sem professor ${grupo}`
                                    )}
                                    valor={aula[grupo].professor}
                                    onChange={(valor) => atualizarAulaDividida(index, grupo, 'professor', valor)}
                                    id={`crono-prof-${grupo}-${aula.id}`}
                                    dropdownAberto={dropdownEditorAberto}
                                    setDropdownAberto={setDropdownEditorAberto}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="crono-celula" data-label="Sala">
                            <div className='crono-editor-stack'>
                              {['A', 'B'].map((grupo) => (
                                <input
                                  key={grupo}
                                  value={aula[grupo].sala}
                                  onChange={(e) => atualizarAulaDividida(index, grupo, 'sala', e.target.value)}
                                  placeholder={`Sala ${grupo}`}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="crono-celula" data-label="Disciplina">
                            <div className='crono-editor-grade-dropdown'>
                              <DropdownComPortal
                                opcoes={opcoesDisciplinasEditor(aula.disciplina)}
                                valor={aula.disciplina}
                                onChange={(valor) => atualizarDisciplinaAula(index, valor)}
                                id={`crono-disc-${aula.id}`}
                                dropdownAberto={dropdownEditorAberto}
                                setDropdownAberto={setDropdownEditorAberto}
                              />
                            </div>
                          </div>

                          <div className="crono-celula" data-label="Professor">
                            <div className='crono-editor-grade-dropdown'>
                              <DropdownComPortal
                                opcoes={opcoesProfessoresComValor(aula.disciplina, aula.professor)}
                                valor={aula.professor}
                                onChange={(valor) => atualizarAulaEditor(index, 'professor', valor)}
                                id={`crono-prof-${aula.id}`}
                                dropdownAberto={dropdownEditorAberto}
                                setDropdownAberto={setDropdownEditorAberto}
                              />
                            </div>
                          </div>

                          <div className="crono-celula" data-label="Sala">
                            <input
                              value={aula.sala}
                              onChange={(e) => atualizarAulaEditor(index, 'sala', e.target.value)}
                              placeholder='Sala'
                            />
                          </div>
                        </>
                      )}

                      {/* Botão da Lixeira que agora abre o novo modal */}
                      <button
                        className='crono-editor-remover'
                        onClick={() => setConfirmarDeleteAulaIndex(index)}
                        aria-label='Remover aula'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>

          {(erroEditor || sucessoEditor) && (
            <p className={`crono-editor-feedback ${erroEditor ? 'erro' : 'sucesso'}`}>
              {erroEditor || sucessoEditor}
            </p>
          )}
        </section>
      )}

      {loading ? (
        <p className='crono-vazia'>Carregando horário...</p>
      ) : status ? (
        <div className='crono-vazia'>
          <p>{status}</p>
        </div>
      ) : (
        <AnimatePresence mode='wait'>
          {!cursoSelecionado ? (
            <MotionDiv
              key='cursos'
              className='crono-cursos-grid'
              {...ANIMACAO_PAINEL}
            >
              {cursos.map((curso, index) => (
                <MotionDiv
                  key={curso.id}
                  className={`crono-curso-card ${deletandoCursoId === curso.id ? 'deletando' : ''}`}
                  onClick={() => abrirCurso(curso)}
                  onKeyDown={(event) => abrirCursoPeloTeclado(event, curso)}
                  role='button'
                  tabIndex={0}
                  {...ANIMACAO_CARD_CURSO}
                  transition={{
                    ...TRANSICAO_CRONOGRAMA,
                    delay: Math.min(index * 0.035, 0.18),
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isCoordenador && (
                    <button
                      type='button'
                      className='crono-curso-deletar'
                      onClick={(event) => solicitarDeleteCurso(curso, event)}
                      disabled={Boolean(deletandoCursoId)}
                      aria-label={`Deletar curso ${curso.titulo}`}
                      title='Deletar curso'
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <span className='crono-curso-ano'>{curso.ano ? `${curso.ano}º ano` : 'Curso'}</span>
                  <strong>{curso.cursoNome}</strong>
                  <span className='crono-curso-sigla'>{curso.id}</span>
                  <span className='crono-curso-meta'>
                    {curso.aulas.length} aula{curso.aulas.length !== 1 ? 's' : ''} • {curso.dias.size} dia{curso.dias.size !== 1 ? 's' : ''}
                  </span>
                  <span className='crono-curso-meta'>
                    {curso.professores.size} professor{curso.professores.size !== 1 ? 'es' : ''}
                  </span>
                </MotionDiv>
              ))}
            </MotionDiv>
          ) : (
            <MotionDiv
              key={`curso-${cursoSelecionado.id}`}
              {...ANIMACAO_PAINEL}
            >
              <div className='crono-dias'>
                {DIAS.map((dia) => {
                  const temAula = aulasVisiveis.some((a) => a.dia === DIA_LABEL[dia])
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

              <p className='crono-data'>{formatarData(diaAtivo)}</p>

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
                        const { bg, cor } = corDisciplina(disc, coresDisciplinas)
                        const primeiraLinha = i === 0
                        const ocultarOrdem = divisaoDaAula(aula) === 'B'

                        return (
                          <div key={i} className='crono-pill-row'>
                            <span className={`crono-pill-ordem ${ocultarOrdem ? 'vazia' : ''}`}>
                              {ocultarOrdem ? '' : rotuloAulaComHorario(aula)}
                            </span>

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

                            <div className='crono-pill-col'>
                              {primeiraLinha && <span className='crono-pill-label'>Turma</span>}
                              <span className='crono-pill-turma'>
                                {aula.turma || '—'}
                              </span>
                            </div>

                            <div className='crono-pill-col'>
                              {primeiraLinha && <span className='crono-pill-label'>Professor</span>}
                              <span className='crono-pill-professor'>
                                {aula.professor || 'Sem professor'}
                              </span>
                            </div>

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
            </MotionDiv>
          )}
        </AnimatePresence>
      )}

      {/* Modal Deletar CURSO (Mantido) */}
      {confirmarDeleteCurso && (
        <ModalConfirmarCurso
          curso={confirmarDeleteCurso}
          onConfirmar={executarDeleteCurso}
          onCancelar={() => setConfirmarDeleteCurso(null)}
          deletando={deletandoCursoId === confirmarDeleteCurso.id}
        />
      )}

      {/* NOVO Modal Deletar AULA (Grade Editor) */}
      {confirmarDeleteAulaIndex !== null && (
        <ModalConfirmarAula
          aula={aulasEditor[confirmarDeleteAulaIndex]}
          coresDisciplinas={coresDisciplinas}
          onConfirmar={() => {
            removerLinhaAula(confirmarDeleteAulaIndex)
            setConfirmarDeleteAulaIndex(null)
          }}
          onCancelar={() => setConfirmarDeleteAulaIndex(null)}
        />
      )}

    </div>
  )
}