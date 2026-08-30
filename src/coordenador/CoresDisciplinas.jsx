import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Save, CheckCircle } from 'lucide-react'
import {
  buscarCronograma,
  buscarTurmas,
  salvarCoresDisciplinas,
} from '../firebase/estrutura'
import useCoresDisciplinas from '../hooks/useCoresDisciplinas'
import {
  CORES_RECOMENDADAS_DISCIPLINAS,
  hexValido,
  montarCoresDisciplina,
  normalizarDisciplina,
  normalizarHex,
  resolverHexDisciplina,
} from '../secoes/coresDisciplinas'
import ColorPickerDisciplina from '../componentes/ColorPickerDisciplina'
import './coordenador.css'

const MotionDiv = motion.div

// ─── Modal Salvo com Sucesso ────────────────────────────────────────────────

function ModalSalvoSucesso({ onFechar }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFechar()
    }, 2500) // O modal fechará passados 2,5 segundos
    return () => clearTimeout(timer)
  }, [onFechar])

  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onFechar} />
      <div className='modal-confirmar'>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#D1FAE5', // Verde bem claro para o fundo do ícone
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <CheckCircle size={26} color='#10B981' strokeWidth={2.2} /> {/* Verde esmeralda */}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Salvo com sucesso!
        </h3>

        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
          Todas as suas alterações foram registradas e já estão ativas no sistema.
        </p>

        <div style={{ display: 'flex' }}>
          <button
            onClick={onFechar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none', background: '#10B981', // Verde principal
              fontSize: 13, fontFamily: "'Poppins', sans-serif",
              fontWeight: 600, color: '#fff', cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </>
  )
}

function coletarDisciplinasDasAulas(aulas = []) {
  const nomes = []
  aulas.forEach((aula) => {
    if (aula.disciplina) nomes.push(aula.disciplina)
    if (aula.A?.disciplina) nomes.push(aula.A.disciplina)
    if (aula.B?.disciplina) nomes.push(aula.B.disciplina)
  })
  return nomes
}

export default function CoresDisciplinas({ uid, professor, cronogramas = [] }) {
  const coresSalvas = useCoresDisciplinas()
  const [coresDraft, setCoresDraft] = useState({})
  const [disciplinas, setDisciplinas] = useState([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [mostrarModalSalvo, setMostrarModalSalvo] = useState(false)

  useEffect(() => {
    setCoresDraft(coresSalvas)
  }, [coresSalvas])

  useEffect(() => {
    if (!uid) return

    async function carregarDisciplinas() {
      setCarregando(true)
      setErro('')
      try {
        const [turmas, aulas] = await Promise.all([
          buscarTurmas(uid, professor),
          cronogramas.length > 0 ? Promise.resolve(cronogramas) : buscarCronograma(uid, professor),
        ])

        const nomes = [
          ...turmas.map((turma) => turma.disciplina),
          ...coletarDisciplinasDasAulas(aulas),
          ...Object.values(coresSalvas).map((item) => item?.nome),
        ]

        const mapa = new Map()
        nomes.filter(Boolean).forEach((nome) => {
          const chave = normalizarDisciplina(nome)
          if (chave && !mapa.has(chave)) mapa.set(chave, String(nome).trim())
        })

        setDisciplinas([...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR')))
      } catch (err) {
        console.error('Erro ao carregar disciplinas para cores:', err)
        setErro('Nao foi possivel carregar as disciplinas.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDisciplinas()
  }, [uid, professor, cronogramas, coresSalvas])

  const disciplinasVisiveis = useMemo(() => {
    if (disciplinas.length > 0) return disciplinas
    return Object.values(coresDraft).map((item) => item?.nome).filter(Boolean)
  }, [disciplinas, coresDraft])

  function definirCor(nome, cor) {
    const chave = normalizarDisciplina(nome)
    const corNormalizada = normalizarHex(cor)
    setErro('')
    setCoresDraft((atual) => ({
      ...atual,
      [chave]: { nome, cor: corNormalizada },
    }))
  }

  async function salvarCores() {
    const coresParaSalvar = disciplinasVisiveis.reduce((mapa, disciplina) => {
      const chave = normalizarDisciplina(disciplina)
      if (!chave) return mapa

      const atual = coresDraft[chave]
      return {
        ...mapa,
        [chave]: {
          nome: atual?.nome || disciplina,
          cor: atual?.cor || resolverHexDisciplina(disciplina, coresDraft),
        },
      }
    }, { ...coresDraft })

    const entradaInvalida = Object.values(coresParaSalvar).find((item) => item?.cor && !hexValido(item.cor))
    if (entradaInvalida) {
      setErro(`A cor de ${entradaInvalida.nome} precisa estar no formato #RRGGBB.`)
      return
    }

    setSalvando(true)
    setErro('')
    try {
      await salvarCoresDisciplinas(uid, coresParaSalvar)
      setCoresDraft(coresParaSalvar)
      setMostrarModalSalvo(true)
    } catch (err) {
      console.error('Erro ao salvar cores das disciplinas:', err)
      setErro('Erro ao salvar as cores. Verifique as permissoes do Firestore.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className='cores-disc-container'>

      <div
        className='cores-disc-topo'
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
          <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-block' }}>Coordenador</span>
          <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
            Cores das disciplinas
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Identidade visual para turmas e cronogramas.
          </p>
        </div>

        <button className='cores-disc-salvar' onClick={salvarCores} disabled={salvando}>
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar cores'}
        </button>
      </div>

      <section className='cores-disc-card'>
        <div className='cores-disc-card-header'>
          <div className='cores-disc-icone'>
            <Palette size={20} />
          </div>
          <div>
            <h2>Paleta recomendada</h2>
            <p>Cores sugeridas para diferenciar disciplinas.</p>
          </div>
        </div>

        <div className='cores-disc-recomendadas'>
          {CORES_RECOMENDADAS_DISCIPLINAS.map((cor) => (
            <span
              key={cor}
              className='cores-disc-swatch'
              style={{ background: cor }}
              title={cor}
            />
          ))}
        </div>
      </section>

      <section className='cores-disc-card-2'>
        {erro && <p className='cores-disc-feedback erro'>{erro}</p>}

        {carregando ? (
          <p className='cores-disc-vazio'>Carregando disciplinas...</p>
        ) : disciplinasVisiveis.length === 0 ? (
          <p className='cores-disc-vazio'>Nenhuma disciplina encontrada ainda.</p>
        ) : (
          <div className='cores-disc-lista'>
            {disciplinasVisiveis.map((disciplina, index) => {
              const chave = normalizarDisciplina(disciplina)
              const corAtual = coresDraft[chave]?.cor || resolverHexDisciplina(disciplina, coresDraft)
              const preview = montarCoresDisciplina(disciplina, coresDraft)

              return (
                <MotionDiv
                  key={chave}
                  className='cores-disc-item'
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.2) }}
                >
                  <div className='cores-disc-preview' style={{ background: preview.bg, color: preview.cor }}>
                    <span className='cores-disc-dot' style={{ background: preview.ativo }} />
                    <div>
                      <strong>{disciplina}</strong>
                      <span>{corAtual}</span>
                    </div>
                  </div>

                  <div className='cores-disc-controles'>
                    <ColorPickerDisciplina
                      value={hexValido(corAtual) ? normalizarHex(corAtual) : '#6F3B9D'}
                      onChange={(cor) => definirCor(disciplina, cor)}
                      disciplina={disciplina}
                    />
                  </div>
                </MotionDiv>
              )
            })}
          </div>
        )}
      </section>

      {mostrarModalSalvo && (
        <ModalSalvoSucesso onFechar={() => setMostrarModalSalvo(false)} />
      )}
    </div>
  )
}