import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Plus, Save, Trash2, TriangleAlert, UsersRound } from 'lucide-react'
import {
  buscarProfessores,
  escutarProfessoresDisciplinas,
  salvarCoresDisciplinas,
  salvarProfessoresDisciplinas,
} from '../firebase/estrutura'
import useCoresDisciplinas from '../hooks/useCoresDisciplinas'
import { montarCoresDisciplina, normalizarDisciplina, resolverHexDisciplina } from '../secoes/coresDisciplinas'
import { ehDisciplinaComSufixo } from '../secoes/vinculosDisciplinas'
import DropdownComPortal from '../secoes/DropwdownComPortal'
import './coordenador.css'

const LETRAS_PROFESSORES = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function valorProfessor(professor) {
  return professor?.id || professor?.email || professor?.nome || ''
}

function dadosProfessor(professores, valor) {
  return professores.find((professor) => valorProfessor(professor) === valor) || null
}

function montarVinculo(disciplina, professor) {
  return {
    disciplina,
    professorId: professor?.id || '',
    professorNome: professor?.nome || '',
    professorEmail: professor?.email || '',
  }
}
// --- MODAL DE CONFIRMAÇÃO DE DESVÍNCULO DE PROFESSOR ---
function ModalConfirmarDesvinculo({ disciplina, professorLetra, professorValor, onConfirmar, onCancelar }) {
  // Caso a letra seja 'B', 'C', etc., usamos isso para mostrar. Se for o principal, não tem letra.
  const tituloProfessor = professorLetra ? `Professor ${professorLetra}` : 'Professor Principal';

  return (
    <>
      <div className="modal-confirmar-overlay" onClick={onCancelar} style={{ zIndex: 99999 }} />
      <div className="modal-confirmar" style={{ zIndex: 100000 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#FFF0F3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <Trash2 size={26} color="#ED235C" strokeWidth={2.2} />
        </div>
        
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Remover professor?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a desvincular o professor da disciplina:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          background: '#FFF0F3', margin: '0 0 6px', animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ED235C', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ED235C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {disciplina}
            </div>
            <div style={{ fontSize: 11, color: '#ED235C', opacity: 0.8 }}>
              Remover: {tituloProfessor}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Esta ação removerá o professor desta disciplina.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--borda)', background: 'var(--branco)',
              fontSize: 13, fontFamily: "'Poppins', sans-serif", color: 'var(--texto)', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--roxo)'; e.currentTarget.style.color = 'var(--roxo)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--borda)'; e.currentTarget.style.color = 'var(--texto-sec)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#ED235C',
              fontSize: 13, fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c71b4d'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ED235C'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Sim, remover
          </button>
        </div>
      </div>
    </>
  );
}

// --- MODAL DE SUCESSO (genérico: disciplina adicionada / vínculos salvos) ---
function ModalSucessoDisciplinas({ mensagem, onFechar }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFechar()
    }, 2500) // O modal fechará passados 2,5 segundos
    return () => clearTimeout(timer)
  }, [onFechar])

  return (
    <>
      <div className='modal-confirmar-overlay' onClick={onFechar} style={{ zIndex: 99999 }} />
      <div className='modal-confirmar' style={{ zIndex: 100000 }}>
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
          {mensagem}
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

export default function ProfessoresDisciplinas({ uid }) {
  const coresDisciplinas = useCoresDisciplinas()
  const [professores, setProfessores] = useState([])
  const [vinculosDraft, setVinculosDraft] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [animacaoErro, setAnimacaoErro] = useState(0) // dispara a animação da caixa de erro a cada novo erro
  const [campoDisciplinaComErro, setCampoDisciplinaComErro] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(null)
  const [professoresExtras, setProfessoresExtras] = useState({})
  const [novaDisciplina, setNovaDisciplina] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [confirmarDeleteProfessor, setConfirmarDeleteProfessor] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  const dispararErro = (mensagem, comCampoDisciplina = false) => {
    setErro(mensagem)
    setCampoDisciplinaComErro(comCampoDisciplina)
    setAnimacaoErro((valorAtual) => valorAtual + 1)
  }

  useEffect(() => {
    let ativo = true

    buscarProfessores(uid).then((lista) => {
      if (ativo) setProfessores(lista)
    })
      .catch((err) => {
        console.error('Erro ao carregar professores para disciplinas:', err)
        if (ativo) dispararErro('Nao foi possivel carregar os professores.')
      })

    return () => { ativo = false }
  }, [])

  useEffect(() => {
    const unsubscribe = escutarProfessoresDisciplinas(uid,
      (vinculos) => {
        setVinculosDraft(vinculos)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao carregar vinculos de disciplinas:', err)
        dispararErro('Nao foi possivel carregar os vinculos.')
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
      .filter((nome) => !ehDisciplinaComSufixo(nome))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [coresDisciplinas])

  const opcoesProfessores = useMemo(() => ([
    { valor: '', label: 'Sem professor' },
    ...professores
      .map((professor) => ({
        valor: valorProfessor(professor),
        label: professor.nome || professor.email || 'Professor',
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  ]), [professores])

  async function adicionarDisciplina() {
    const nome = novaDisciplina.trim()
    const chave = normalizarDisciplina(nome)
    if (!chave) return

    if (coresDisciplinas[chave]) {
      dispararErro(`A disciplina "${nome}" já existe.`, true)
      return
    }

    const cor = resolverHexDisciplina(nome, coresDisciplinas)

    setAdicionando(true)
    setErro('')
    setCampoDisciplinaComErro(false)
    try {
      await salvarCoresDisciplinas(uid, {
        ...coresDisciplinas,
        [chave]: { nome, cor },
      })
      setNovaDisciplina('')
      setMensagemSucesso(`Disciplina "${nome}" adicionada.`)
    } catch (err) {
      console.error('Erro ao adicionar disciplina:', err)
      dispararErro('Erro ao adicionar a disciplina. Verifique as permissoes do Firestore.')
    } finally {
      setAdicionando(false)
    }
  }

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

// Função ativada ao clicar na lixeira (abre o modal)
  function removerProfessorExtra(disciplina, letra) {
    setConfirmarDeleteProfessor({ disciplina, letra });
  }

  // Função ativada ao confirmar no modal (executa a deleção)
  function executarRemocaoProfessorExtra() {
    if (!confirmarDeleteProfessor) return;

    const { disciplina, letra } = confirmarDeleteProfessor;
    const chaveBase = normalizarDisciplina(disciplina);
    const chaveLetra = normalizarDisciplina(`${disciplina} ${letra}`);

    setErro('');
    setCampoDisciplinaComErro(false);
    
    // 1. Remove da lista de visíveis
    setProfessoresExtras((atual) => ({
      ...atual,
      [chaveBase]: (atual[chaveBase] || []).filter((item) => item !== letra),
    }));
    
    // 2. Remove do rascunho (draft) para não ser salvo
    setVinculosDraft((atual) => {
      const proximo = { ...atual };
      delete proximo[chaveLetra];
      return proximo;
    });

    setConfirmarDeleteProfessor(null);
  }

  function atualizarVinculo(disciplina, professorValor, sufixo = '') {
    const nomeDisciplina = sufixo ? `${disciplina} ${sufixo}` : disciplina
    const chave = normalizarDisciplina(nomeDisciplina)
    const professor = dadosProfessor(professores, professorValor)

    setErro('')
    setCampoDisciplinaComErro(false)
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
    setErro('')
    setCampoDisciplinaComErro(false)

    try {
      await salvarProfessoresDisciplinas(uid, vinculosDraft)
      setMensagemSucesso('Professores vinculados as disciplinas.')
    } catch (err) {
      console.error('Erro ao salvar vinculos de disciplinas:', err)
      dispararErro('Erro ao salvar os vinculos. Verifique as permissoes do Firestore.')
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
            Professores por disciplina
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Vincule os professores às suas respectivas disciplinas.
          </p>
        </div>

        <button className='cores-disc-salvar' onClick={salvarVinculos} disabled={salvando}>
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar vinculos'}
        </button>
      </div>

      <section className='cores-disc-card'>
        <div className='cores-disc-add'>
          <div className='cores-disc-input-wrap'>
            <label>Adicionar disciplina</label>
            <input
              key={campoDisciplinaComErro ? `nova-disciplina-erro-${animacaoErro}` : 'nova-disciplina'}
              className={campoDisciplinaComErro ? 'perfil-input-erro' : ''}
              value={novaDisciplina}
              onChange={(e) => {
                setNovaDisciplina(e.target.value)
                setErro('')
                setCampoDisciplinaComErro(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') adicionarDisciplina()
              }}
              placeholder='Ex: Matemática aplicada'
            />
          </div>
          <button className='cores-disc-add-btn' onClick={adicionarDisciplina} disabled={adicionando}>
            <Plus size={16} />
            {adicionando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </section>

      <section className='cores-disc-card'>
        <div className='cores-disc-card-header'>
          <div className='cores-disc-icone'>
            <UsersRound size={20} />
          </div>
          <div>
            <h2>Disciplinas cadastradas</h2>
          </div>
        </div>

        {erro && (
          <div key={animacaoErro} className='cores-disc-feedback erro upload-erro-anim'>
            <TriangleAlert size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {erro}
          </div>
        )}

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
  
  {/* COLUNA 1: Caixa da Matéria */}
  <div className='disc-prof-preview' style={{ background: preview.bg, color: preview.cor }}>
    <span className='cores-disc-dot' style={{ background: preview.ativo }} />
    <strong>{disciplina}</strong>
  </div>

  {/* COLUNA 2: Grid com os selects dos professores */}
  <div className='disc-prof-professores-grid'>
    
    {/* Professor Principal */}
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

    {/* Professores Extras (B, C, D...) */}
    {letras.map((letra) => {
      const chaveLetra = normalizarDisciplina(`${disciplina} ${letra}`)
      const valorLetra = vinculosDraft[chaveLetra]?.professorId || vinculosDraft[chaveLetra]?.professorEmail || ''
      const opcoesLetra = [
        { valor: '', label: `Sem professor ${letra}` },
        ...opcoesProfessores.slice(1),
      ]

      return (
        <div key={letra} className='disc-prof-extra-linha'>
          <div className='disc-prof-dropdown'>
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

          {letra !== 'B' && (
            <button
              type='button'
              className='disc-prof-remover'
              onClick={() => removerProfessorExtra(disciplina, letra)}
              title={`Remover professor ${letra}`}
              aria-label={`Remover professor ${letra}`}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    })}
  </div>

  {/* COLUNA 3: Botão "+" fixo na direita */}
  {proximaLetra && (
    <button
      type='button'
      className='disc-prof-add-fixo'
      onClick={() => adicionarProfessorExtra(disciplina)}
      title={`Adicionar Professor ${proximaLetra}`}
    >
      <Plus size={20} />
    </button>
  )}
  
</div>



              )
            })}

            
          </div>
        )}
      </section>

      {/* ... fechamento do <section className='cores-disc-card'> */}
      
      {/* RENDERIZA O MODAL DE CONFIRMAÇÃO SE HOUVER UM PROFESSOR SENDO REMOVIDO */}
      {confirmarDeleteProfessor && (
        <ModalConfirmarDesvinculo
          disciplina={confirmarDeleteProfessor.disciplina}
          professorLetra={confirmarDeleteProfessor.letra}
          onConfirmar={executarRemocaoProfessorExtra}
          onCancelar={() => setConfirmarDeleteProfessor(null)}
        />
      )}

      {/* RENDERIZA O MODAL DE SUCESSO (disciplina adicionada / vínculos salvos) */}
      {mensagemSucesso && (
        <ModalSucessoDisciplinas
          mensagem={mensagemSucesso}
          onFechar={() => setMensagemSucesso('')}
        />
      )}

    </div>
  )
}