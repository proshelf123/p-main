import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Plus, Save } from 'lucide-react'
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
  const [novaDisciplina, setNovaDisciplina] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

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
    setStatus('')
    setErro('')
    setCoresDraft((atual) => ({
      ...atual,
      [chave]: { nome, cor: corNormalizada },
    }))
  }

  function adicionarDisciplina() {
    const nome = novaDisciplina.trim()
    const chave = normalizarDisciplina(nome)
    if (!chave) return
    const corInicial = resolverHexDisciplina(nome, coresDraft)

    setDisciplinas((atuais) => (
      atuais.some((disciplina) => normalizarDisciplina(disciplina) === chave)
        ? atuais
        : [...atuais, nome].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    ))
    setCoresDraft((atual) => ({
      ...atual,
      [chave]: atual[chave] || { nome, cor: corInicial },
    }))
    setNovaDisciplina('')
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
    setStatus('')
    try {
      await salvarCoresDisciplinas(uid, coresParaSalvar)
      setCoresDraft(coresParaSalvar)
      setStatus('Cores das disciplinas atualizadas.')
    } catch (err) {
      console.error('Erro ao salvar cores das disciplinas:', err)
      setErro('Erro ao salvar as cores. Verifique as permissoes do Firestore.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className='cores-disc-container'>
      <div className='cores-disc-topo'>
        <div>
          <span className='cores-disc-kicker'>Coordenador</span>
          <h1>Cores das disciplinas</h1>
          <p>Identidade visual para turmas e cronogramas.</p>
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

      <section className='cores-disc-card'>
        <div className='cores-disc-add'>
          <div className='cores-disc-input-wrap'>
            <label>Adicionar disciplina</label>
            <input
              value={novaDisciplina}
              onChange={(e) => setNovaDisciplina(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') adicionarDisciplina()
              }}
              placeholder='Ex: Matemática aplicada'
            />
          </div>
          <button className='cores-disc-add-btn' onClick={adicionarDisciplina}>
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {erro && <p className='cores-disc-feedback erro'>{erro}</p>}
        {status && <p className='cores-disc-feedback sucesso'>{status}</p>}

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
    </div>
  )
}
