// src/coordenador/CadastroProfessores.jsx
//
// Usa Cloud Functions para criar a conta do professor
// sem deslogar o coordenador.

import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions, db } from '../firebase'
import './coordenador.css'
import { Trash2, TriangleAlert, CircleCheckBig } from 'lucide-react'
import { criarNotificacao } from '../notificacoes/notificacoes'


const FORM_INICIAL = { nome: '', email: '', senha: '', nomePDF: '' }

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizarNomePDF(nomePDF) {
  return String(nomePDF || '').trim().toUpperCase()
}

function mensagemErro(error, fallback) {
  const code = String(error?.code || '')

  if (code.includes('unauthenticated')) return 'Sua sessão expirou. Faça login novamente.'
  if (code.includes('permission-denied')) return 'Apenas coordenadores podem gerenciar professores.'
  if (code.includes('invalid-argument')) return error?.message || fallback
  if (code.includes('not-found')) return 'Professor não encontrado.'
  if (code.includes('already-exists')) return 'Este e-mail já está cadastrado.'
  if (code.includes('internal')) {
    return 'Não foi possível concluir a ação. Verifique se as Cloud Functions foram publicadas e tente novamente.'
  }

  return error?.message || fallback
}

function obterNomeProfessor(professor) {
  return professor?.nomePDF || professor?.nome || professor?.email || 'Professor'
}

export default function CadastroProfessores() {
  const [professores, setProfessores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [salvando, setSalvando]       = useState(false)
  const [salvo, setSalvo]             = useState(false)
  const [erro, setErro]               = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [excluindoId, setExcluindoId] = useState('')

  const componenteAtivoRef = useRef(true)
  const salvoTimeoutRef = useRef(null)

  const carregarProfessores = useCallback(async ({ mostrarLoading = true } = {}) => {
    if (mostrarLoading) setLoading(true)

    try {
      const snap = await getDocs(collection(db, 'professores_escola'))
      const lista = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => obterNomeProfessor(a).localeCompare(
          obterNomeProfessor(b),
          'pt-BR',
          { sensitivity: 'base' },
        ))

      if (!componenteAtivoRef.current) return
      setProfessores(lista)
    } catch (error) {
      console.error('Erro ao carregar professores:', error)

      if (!componenteAtivoRef.current) return
      setErro(mensagemErro(error, 'Erro ao carregar professores.'))
      setProfessores([])
    } finally {
      if (componenteAtivoRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    componenteAtivoRef.current = true
    carregarProfessores()

    return () => {
      componenteAtivoRef.current = false
      if (salvoTimeoutRef.current) clearTimeout(salvoTimeoutRef.current)
    }
  }, [carregarProfessores])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((formAtual) => ({ ...formAtual, [name]: value }))
    setErro('')
  }

  function handleNomePDFChange(e) {
    const nomePDF = normalizarNomePDF(e.target.value)
    setForm((formAtual) => ({ ...formAtual, nomePDF }))
    setErro('')
  }

  /**
   * Garante que o documento users/{uid} existe no Firestore com role: "professor".
   * Isso é necessário para que criarNotificacaoPorRole({ role: "professor" }) 
   * consiga encontrar o professor pela query where("role", "==", "professor").
   * 
   * Usa { merge: true } para não sobrescrever dados caso o professor já tenha
   * feito login e tenha dados adicionais no perfil.
   */
  async function garantirPerfilNoFirestore(uid, dados) {
    try {
      await setDoc(doc(db, 'users', uid), {
        nome: dados.nome,
        email: dados.email,
        role: 'professor',
        nomePDF: dados.nomePDF,
        criadoEm: serverTimestamp(),
      }, { merge: true })
    } catch (err) {
      // Não bloqueia o cadastro se falhar — o professor ainda pode logar
      // e o criarPerfil() vai criar o documento no primeiro login
      console.warn('Não foi possível criar perfil no Firestore:', err)
    }
  }

  async function enviarNotificacaoBoasVindas(uid, nome) {
    try {
      const resultado = await criarNotificacao({
        titulo: "Bem-vindo ao ProShelf!",
        mensagem: `Olá ${nome}, sua conta de acesso foi criada com sucesso pelo coordenador.`,
        tipo: "aviso",
        link: "/perfil",
        destinatarioUids: [uid],
        criadoPorNome: "Coordenação"
      })

      if (resultado?.sucesso === false) {
        console.warn("Notificação de boas-vindas não foi criada:", resultado)
      }
    } catch (notifErr) {
      console.error("Erro ao enviar notificação de boas-vindas:", notifErr)
    }
  }

  async function handleSalvar() {
    if (salvando) return

    const dados = {
      nome: form.nome.trim(),
      email: normalizarEmail(form.email),
      senha: form.senha,
      nomePDF: normalizarNomePDF(form.nomePDF),
    }

    if (!dados.nome || !dados.email || !dados.senha || !dados.nomePDF) {
      setErro('Preencha todos os campos.'); return
    }
    if (!dados.email.includes('@')) {
      setErro('Digite um e-mail válido.'); return
    }
    if (dados.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.'); return
    }

    setSalvando(true)
    setErro('')
    setSalvo(false)

    try {
      const criarProfessor = httpsCallable(functions, 'criarProfessorHttp')
      const resultadoId = await criarProfessor(dados)
      const uidCriado = resultadoId?.data?.uid

      if (!uidCriado) {
        throw new Error('A função criou o professor, mas não retornou o UID.')
      }

      // ── NOVO: cria users/{uid} com role: "professor" para que as
      //         notificações por role funcionem imediatamente ──────
      await garantirPerfilNoFirestore(uidCriado, dados)

      await enviarNotificacaoBoasVindas(uidCriado, dados.nome)

      if (!componenteAtivoRef.current) return
      setForm(FORM_INICIAL)
      setSalvo(true)

      if (salvoTimeoutRef.current) clearTimeout(salvoTimeoutRef.current)
      salvoTimeoutRef.current = setTimeout(() => {
        if (componenteAtivoRef.current) setSalvo(false)
      }, 3000)

      await carregarProfessores({ mostrarLoading: false })

    } catch (error) {
      console.error('Erro ao cadastrar professor:', error)

      if (componenteAtivoRef.current) {
        setErro(mensagemErro(error, 'Erro ao cadastrar professor.'))
      }
    } finally {
      if (componenteAtivoRef.current) setSalvando(false)
    }
  }

  async function handleDeletar(professor) {
    const email = normalizarEmail(professor?.email)
    const id = professor?.id || email

    if (!email) {
      setErro('Não foi possível remover: o professor está sem e-mail cadastrado.')
      return
    }

    if (!window.confirm('Remover este professor? Isso apaga a conta de acesso dele.')) return

    setErro('')
    setExcluindoId(id)
    try {
      const deletarProfessor = httpsCallable(functions, 'deletarProfessorHttp')
      await deletarProfessor({ email })
      await carregarProfessores({ mostrarLoading: false })
    } catch (error) {
      console.error('Erro ao remover professor:', error)

      if (componenteAtivoRef.current) {
        setErro(mensagemErro(error, 'Erro ao remover professor.'))
      }
    } finally {
      if (componenteAtivoRef.current) setExcluindoId('')
    }
  }

  return (
    <div className='upload-container' style={{ maxWidth: 620 }}>
      <div className='upload-header'>
        <span className='upload-badge'>Coordenador</span>
        <h2 className='upload-titulo'>Cadastro de Professores</h2>
        <p className='upload-desc'>
          Cadastre o professor criando a conta de acesso e vinculando ao nome
          que aparece no PDF do horário. O coordenador não é deslogado!
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, }}>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Nome completo do professor</label>
          <input className='perfil-input' name='nome' value={form.nome}
            onChange={handleChange} placeholder='Ex: Maria José da Silva' />
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>E-mail de acesso</label>
          <input className='perfil-input' type='email' name='email' value={form.email}
            onChange={handleChange} placeholder='professor@email.com' />
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Senha temporária</label>
          <div style={{ position: 'relative' }}>
            <input
              className='perfil-input'
              type={mostrarSenha ? 'text' : 'password'}
              name='senha' value={form.senha}
              onChange={handleChange}
              placeholder='Mínimo 6 caracteres'
              style={{ paddingRight: 80 }}
            />
            <button type='button' onClick={() => setMostrarSenha(v => !v)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--texto-sec)', fontFamily: 'Poppins, sans-serif',
            }}>
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--texto-sec)', marginTop: 3 }}>
            O professor pode trocar a senha depois em Configurações
          </span>
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Nome no PDF do horário (MAIÚSCULAS)</label>
          <input
            className='perfil-input' name='nomePDF' value={form.nomePDF}
            onChange={handleNomePDFChange}
            placeholder='Ex: GETULIO, MARIA JOSÉ, ADILSON'
            style={{ textTransform: 'uppercase' }}
          />
          <span style={{ fontSize: 11, color: 'var(--texto-sec)', marginTop: 3 }}>
            Copie o nome exatamente como aparece no PDF do horário
          </span>
        </div>

        {erro && <div className='upload-erro'><TriangleAlert size={25}/> {erro}</div>}

        {salvo && (
          <div className='upload-sucesso'>
            <CircleCheckBig /> Professor cadastrado! Ele já pode fazer login com o e-mail e senha definidos.
          </div>
        )}

        <button className='upload-btn' type='button' onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Cadastrando...' : 'Cadastrar professor'}
        </button>
      </div>

      {/* Lista de professores */}
      <div className='sec-titulo' style={{ fontFamily: 'Poppins, sans-serif' }}>
        Professores cadastrados ({professores.length})
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', fontFamily: 'Poppins, sans-serif' }}>
          Carregando...
        </p>
      ) : professores.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', fontFamily: 'Poppins, sans-serif', padding: '16px 0' }}>
          Nenhum professor cadastrado ainda.
        </p>
      ) : (
        professores.map((professor) => {
          const nome = obterNomeProfessor(professor)
          const id = professor.id || professor.email
          const excluindoEste = excluindoId === id

          return (
            <div key={id} className='professor-card' style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg)', marginBottom: 6,
              fontFamily: 'Poppins, sans-serif',
              border: '0.5px solid var(--borda)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#6F3B9D', color: '#fff',
                fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {nome.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto)' }}>{professor.nomePDF || professor.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--texto-sec)' }}>{professor.email}</div>
              </div>
              <button
                className='professor-remover-btn'
                type='button'
                onClick={() => handleDeletar(professor)}
                disabled={excluindoEste || salvando}
                title='Remover professor'
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}