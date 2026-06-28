import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, UsersRound } from 'lucide-react'
import {
  buscarProfessores,
  escutarProfessoresDisciplinas,
  salvarProfessoresDisciplinas,
} from '../firebase/estrutura'
import useCoresDisciplinas from '../hooks/useCoresDisciplinas'
import { montarCoresDisciplina, normalizarDisciplina } from '../secoes/coresDisciplinas'
import DropdownComPortal from '../secoes/DropwdownComPortal'
import './coordenador.css'

const LETRAS_PROFESSORES = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function valorProfessor(professor) {
  return professor?.id || professor?.email || professor?.nomePDF || professor?.nome || ''
}

function dadosProfessor(professores, valor) {
  return professores.find((professor) => valorProfessor(professor) === valor) || null
}

function montarVinculo(disciplina, professor) {
  return {
    disciplina,
    professorId: professor?.id || '',
    professorNome: professor?.nome || '',
    professorNomePDF: professor?.nomePDF || professor?.nome || '',
    professorEmail: professor?.email || '',
  }
}

export default function ProfessoresDisciplinas({ uid }) {
  const coresDisciplinas = useCoresDisciplinas()
  const [professores, setProfessores] = useState([])
  const [vinculosDraft, setVinculosDraft] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(null)
  const [professoresExtras, setProfessoresExtras] = useState({})

  useEffect(() => {
    let ativo = true

    buscarProfessores()
      .then((lista) => {
        if (ativo) setProfessores(lista)
      })
      .catch((err) => {
        console.error('Erro ao carregar professores para disciplinas:', err)
        if (ativo) setErro('Nao foi possivel carregar os professores.')
      })

    return () => { ativo = false }
  }, [])

  useEffect(() => {
    const unsubscribe = escutarProfessoresDisciplinas(
      (vinculos) => {
        setVinculosDraft(vinculos)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao carregar vinculos de disciplinas:', err)
        setErro('Nao foi possivel carregar os vinculos.')
        setCarregando(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const disciplinas = useMemo(() => {
    const nomes = Object.values(coresDisciplinas)
      .map((item) => item?.nome)
      .filter(Boolean)

    return [...new Set(nomes)]
      .filter((nome) => !normalizarDisciplina(nome).endsWith(' B'))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [coresDisciplinas])

  const opcoesProfessores = useMemo(() => ([
    { valor: '', label: 'Sem professor' },
    ...professores.map((professor) => ({
      valor: valorProfessor(professor),
      label: professor.nomePDF || professor.nome || professor.email || 'Professor',
    })),
  ]), [professores])

  function letrasVisiveis(disciplina) {
    const chaveBase = normalizarDisciplina(disciplina)
    const salvas = Object.keys(vinculosDraft)
      .filter((chave) => chave.startsWith(`${chaveBase} `))
      .map((chave) => chave.slice(chaveBase.length).trim())
      .filter((letra) => LETRAS_PROFESSORES.includes(letra))

    return [...new Set(['B', ...(professoresExtras[chaveBase] || []), ...salvas])]
      .sort((a, b) => LETRAS_PROFESSORES.indexOf(a) - LETRAS_PROFESSORES.indexOf(b))
  }

  function proximaLetraProfessor(disciplina) {
    const usadas = letrasVisiveis(disciplina)
    return LETRAS_PROFESSORES.find((letra) => !usadas.includes(letra)) || ''
  }

  function adicionarProfessorExtra(disciplina) {
    const chaveBase = normalizarDisciplina(disciplina)
    const proxima = proximaLetraProfessor(disciplina)
    if (!proxima) return

    setProfessoresExtras((atual) => ({
      ...atual,
      [chaveBase]: [...new Set([...(atual[chaveBase] || []), proxima])],
    }))
  }

  function atualizarVinculo(disciplina, professorValor, sufixo = '') {
    const nomeDisciplina = sufixo ? `${disciplina} ${sufixo}` : disciplina
    const chave = normalizarDisciplina(nomeDisciplina)
    const professor = dadosProfessor(professores, professorValor)

    setStatus('')
    setErro('')
    setVinculosDraft((atual) => {
      const proximo = { ...atual }

      if (!professor) {
        delete proximo[chave]
        return proximo
      }

      proximo[chave] = montarVinculo(nomeDisciplina, professor)
      return proximo
    })
  }

  async function salvarVinculos() {
    setSalvando(true)
    setStatus('')
    setErro('')

    try {
      await salvarProfessoresDisciplinas(uid, vinculosDraft)
      setStatus('Professores vinculados as disciplinas.')
    } catch (err) {
      console.error('Erro ao salvar vinculos de disciplinas:', err)
      setErro('Erro ao salvar os vinculos. Verifique as permissoes do Firestore.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className='cores-disc-container'>
      <div className='cores-disc-topo'>
        <div>
          <span className='cores-disc-kicker'>Coordenador</span>
          <h1>Professores por disciplina</h1>
        </div>
        <button className='cores-disc-salvar' onClick={salvarVinculos} disabled={salvando}>
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar vinculos'}
        </button>
      </div>

      <section className='cores-disc-card'>
        <div className='cores-disc-card-header'>
          <div className='cores-disc-icone'>
            <UsersRound size={20} />
          </div>
          <div>
            <h2>Disciplinas cadastradas</h2>
          </div>
        </div>

        {erro && <p className='cores-disc-feedback erro'>{erro}</p>}
        {status && <p className='cores-disc-feedback sucesso'>{status}</p>}

        {carregando ? (
          <p className='cores-disc-vazio'>Carregando vinculos...</p>
        ) : disciplinas.length === 0 ? (
          <p className='cores-disc-vazio'>Nenhuma disciplina com cor cadastrada ainda.</p>
        ) : (
          <div className='disc-prof-lista'>
            {disciplinas.map((disciplina) => {
              const chave = normalizarDisciplina(disciplina)
              const preview = montarCoresDisciplina(disciplina, coresDisciplinas)
              const principal = vinculosDraft[chave]?.professorId || vinculosDraft[chave]?.professorEmail || ''
              const letras = letrasVisiveis(disciplina)
              const proximaLetra = proximaLetraProfessor(disciplina)

              return (
                <div key={chave} className='disc-prof-item'>
                  <div className='disc-prof-preview' style={{ background: preview.bg, color: preview.cor }}>
                    <span className='cores-disc-dot' style={{ background: preview.ativo }} />
                    <strong>{disciplina}</strong>
                  </div>

                  <div className='disc-prof-dropdown'>
                    <DropdownComPortal
                      label='Professor'
                      opcoes={opcoesProfessores}
                      valor={principal}
                      onChange={(valor) => atualizarVinculo(disciplina, valor)}
                      id={`disc-prof-${chave}`}
                      dropdownAberto={dropdownAberto}
                      setDropdownAberto={setDropdownAberto}
                    />
                  </div>

                  <div className='disc-prof-extras'>
                    {letras.map((letra) => {
                      const chaveLetra = normalizarDisciplina(`${disciplina} ${letra}`)
                      const valorLetra = vinculosDraft[chaveLetra]?.professorId || vinculosDraft[chaveLetra]?.professorEmail || ''
                      const opcoesLetra = [
                        { valor: '', label: `Sem professor ${letra}` },
                        ...opcoesProfessores.slice(1),
                      ]

                      return (
                        <div key={letra} className='disc-prof-dropdown'>
                          <DropdownComPortal
                            label={`Professor ${letra}`}
                            opcoes={opcoesLetra}
                            valor={valorLetra}
                            onChange={(valor) => atualizarVinculo(disciplina, valor, letra)}
                            id={`disc-prof-${letra.toLowerCase()}-${chave}`}
                            dropdownAberto={dropdownAberto}
                            setDropdownAberto={setDropdownAberto}
                          />
                        </div>
                      )
                    })}

                    {proximaLetra && (
                      <button
                        type='button'
                        className='disc-prof-add'
                        onClick={() => adicionarProfessorExtra(disciplina)}
                      >
                        <Plus size={15} />
                        Professor {proximaLetra}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
