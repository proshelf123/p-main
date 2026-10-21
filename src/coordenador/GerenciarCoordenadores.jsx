// src/coordenador/GerenciarCoordenadores.jsx

import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, functions, db } from '../firebase'
import './coordenador.css'
import { TriangleAlert, CircleCheckBig, ShieldPlus, Search, Eye, EyeOff } from 'lucide-react'

const FORM_INICIAL = { nome: '', email: '', senha: '' }
const FUNCTIONS_HTTP_BASE = 'https://us-central1-proshelf-8ecfd.cloudfunctions.net'

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function mensagemErro(error, fallback) {
  const code = String(error?.code || '')
  if (code.includes('unauthenticated')) return 'Sua sessão expirou. Faça login novamente.'
  if (code.includes('permission-denied')) return 'Sem permissão para realizar esta ação.'
  if (code.includes('already-exists')) return 'Este e-mail já está cadastrado.'
  return error?.message || fallback
}

async function chamarFuncaoHttp(nomeFuncao, dados) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sua sessão expirou.')

  const response = await fetch(`${FUNCTIONS_HTTP_BASE}/${nomeFuncao}Http`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dados }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.error) throw new Error('Erro ao chamar Cloud Function.')
  return { data: payload.result }
}

async function chamarFuncaoServidor(nomeFuncao, dados) {
  try {
    const callable = httpsCallable(functions, nomeFuncao)
    return await callable(dados)
  } catch (error) {
    return chamarFuncaoHttp(nomeFuncao, dados)
  }
}

// --- MODAL DE CONFIRMAÇÃO DE PROMOÇÃO ---
function ModalConfirmarPromover({ professor, onConfirmar, onCancelar }) {
  const nome = professor?.nome || professor?.email || 'Professor'
  const email = professor?.email || ''

  return (
    <>
      <div className="modal-confirmar-overlay" onClick={onCancelar} style={{ zIndex: 99999 }} />
      <div className="modal-confirmar" style={{ zIndex: 100000 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#F1E9FA',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          animation: 'confirm-icon-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both'
        }}>
          <ShieldPlus size={26} color="#6F3B9D" strokeWidth={2.2} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--texto)', margin: '0 0 8px', textAlign: 'center' }}>
          Promover a coordenador?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-sec)', margin: '0 0 6px', textAlign: 'center', lineHeight: 1.5 }}>
          Você está prestes a promover:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          background: '#F1E9FA', margin: '0 0 6px', animation: 'confirm-card-slide 0.3s ease 0.15s both'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6F3B9D', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6F3B9D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nome}
            </div>
            <div style={{ fontSize: 11, color: '#6F3B9D', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--texto-sec)', margin: '0 0 20px', textAlign: 'center' }}>
          Ele(a) passará a ter acesso total de coordenação na escola.
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
              flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#6F3B9D',
              fontSize: 13, fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all .15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5c3080'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#6F3B9D'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            Sim, promover
          </button>
        </div>
      </div>
    </>
  )
}

export default function GerenciarCoordenadores() {
  const [aba, setAba] = useState('novo')
  
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [camposComErro, setCamposComErro] = useState([])
  
  const [professores, setProfessores] = useState([])
  const [busca, setBusca] = useState('')
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [promovendoId, setPromovendoId] = useState(null)
  const [professorParaPromover, setProfessorParaPromover] = useState(null)

  const [erro, setErro] = useState('')
  const [animacaoErro, setAnimacaoErro] = useState(0)
  const [sucesso, setSucesso] = useState('')

  const dispararErro = useCallback((mensagem, campos = []) => {
    setErro(mensagem)
    setCamposComErro(campos)
    setAnimacaoErro((valorAtual) => valorAtual + 1)
  }, [])

  const carregarProfessoresParaPromocao = useCallback(async () => {
    setCarregandoLista(true)
    setErro('')
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Sua sessão expirou.')

      const userSnap = await getDoc(doc(db, 'users', currentUser.uid))
      const escolaId = userSnap.data()?.escolaId

      if (!escolaId) throw new Error("Escola não identificada.")

      const q = query(
        collection(db, 'users'),
        where('escolaId', '==', escolaId),
        where('role', '==', 'professor')
      )
      
      const snap = await getDocs(q)
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email))

      setProfessores(lista)
    } catch (error) {
      console.error("Erro ao carregar professores:", error)
      dispararErro(mensagemErro(error, 'Erro ao carregar lista de professores.'))
    } finally {
      setCarregandoLista(false)
    }
  }, [dispararErro])

  useEffect(() => {
    if (aba === 'promover') {
      carregarProfessoresParaPromocao()
    }
    setErro('')
    setCamposComErro([])
    setSucesso('')
  }, [aba, carregarProfessoresParaPromocao])

  async function handleCriarNovo() {
    if (salvando) return

    const dados = {
      nome: form.nome.trim(),
      email: normalizarEmail(form.email),
      senha: form.senha,
    }

    if (!dados.nome || !dados.email || !dados.senha) {
      dispararErro('Preencha todos os campos.', [
        !dados.nome && 'nome',
        !dados.email && 'email',
        !dados.senha && 'senha',
      ].filter(Boolean))
      return
    }
    if (!dados.email.includes('@')) {
      dispararErro('Digite um e-mail válido.', ['email'])
      return
    }
    if (dados.senha.length < 6) {
      dispararErro('A senha deve ter pelo menos 6 caracteres.', ['senha'])
      return
    }

    setSalvando(true)
    setErro('')
    setCamposComErro([])
    setSucesso('')

    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid))
      const escolaId = userSnap.data()?.escolaId

      const resultado = await chamarFuncaoServidor('criarProfessor', dados)
      const uidCriado = resultado?.data?.uid

      if (!uidCriado) throw new Error('Não foi possível gerar o UID.')

      await setDoc(doc(db, 'users', uidCriado), {
        nome: dados.nome,
        email: dados.email,
        role: 'coordenador',
        escolaId: escolaId,
        criadoEm: serverTimestamp(),
      }, { merge: true })

      setForm(FORM_INICIAL)
      setSucesso(`Coordenador(a) ${dados.nome} cadastrado(a) com sucesso!`)
      setTimeout(() => setSucesso(''), 4000)

    } catch (error) {
      console.error("Erro ao criar coordenador:", error)
      dispararErro(mensagemErro(error, 'Erro ao criar coordenador.'))
    } finally {
      setSalvando(false)
    }
  }

  function handleChangeForm(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    setErro('')
    setCamposComErro([])
  }

  function solicitarPromocao(professor) {
    setProfessorParaPromover(professor)
  }

async function executarPromocao() {
  if (!professorParaPromover) return

  const { id, nome } = professorParaPromover
  setProfessorParaPromover(null)

  setPromovendoId(id)
  setErro('')
  setSucesso('')

  try {
    // Atualização direta pelo cliente
    const userRef = doc(db, 'users', id)
    await updateDoc(userRef, {
      role: 'coordenador'
    })
    
    setSucesso(`${nome} foi promovido(a) a Coordenador(a)!`)
    setTimeout(() => setSucesso(''), 4000)
    
    // Remove o usuário promovido da lista de professores exibida
    setProfessores(prev => prev.filter(p => p.id !== id))
  } catch (error) {
    console.error("Erro ao promover:", error.code, error.message)
    dispararErro(mensagemErro(error, 'Erro ao promover usuário. Tente novamente.'))
  } finally {
    setPromovendoId(null)
  }
}

  const professoresFiltrados = professores.filter(p => 
    (p.nome || '').toLowerCase().includes(busca.toLowerCase()) || 
    (p.email || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div style={{ width: "100%", marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--borda)" }}>
        <div style={{ paddingLeft: "15px", borderLeft: "3px solid var(--roxo)" }}>
          <span className='upload-badge' style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Coordenador
          </span>
          <h2 style={{ fontSize: "25px", fontWeight: 700, color: "var(--texto)", margin: 0, lineHeight: 1.2 }}>
            Gerenciar Coordenadores
          </h2>
          <p style={{ fontSize: "15px", color: "var(--texto-sec)", margin: "3px 0 0" }}>
            Crie novas contas de coordenação ou promova professores existentes.
          </p>
        </div>
      </div>

      <div className="turma-modo-toggle" style={{ marginBottom: 24, display: 'flex' }}>
        <button 
          className={`turma-modo-btn ${aba === 'novo' ? 'ativo' : ''}`} 
          onClick={() => setAba('novo')}
          style={{ flex: 1, padding: '10px' }}
        >
          Criar Nova Conta
        </button>
        <button 
          className={`turma-modo-btn ${aba === 'promover' ? 'ativo' : ''}`} 
          onClick={() => setAba('promover')}
          style={{ flex: 1, padding: '10px' }}
        >
          Promover Existente
        </button>
      </div>

      {erro && (
        <div key={animacaoErro} className='upload-erro upload-erro-anim' style={{ marginBottom: 16 }}>
          <TriangleAlert size={20}/> {erro}
        </div>
      )}
      {sucesso && <div className='upload-sucesso' style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CircleCheckBig size={20}/> {sucesso}</div>}

      {aba === 'novo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.3s ease' }}>
          <div className='perfil-grupo'>
            <label className='perfil-label'>Nome completo</label>
            <input
              key={camposComErro.includes('nome') ? `nome-erro-${animacaoErro}` : 'nome'}
              className={`perfil-input ${camposComErro.includes('nome') ? 'perfil-input-erro' : ''}`}
              name='nome' value={form.nome}
              onChange={e => handleChangeForm('nome', e.target.value)} placeholder='Nome do novo coordenador'
            />
          </div>

          <div className='perfil-grupo'>
            <label className='perfil-label'>E-mail de acesso</label>
            <input
              key={camposComErro.includes('email') ? `email-erro-${animacaoErro}` : 'email'}
              className={`perfil-input ${camposComErro.includes('email') ? 'perfil-input-erro' : ''}`}
              type='email' value={form.email}
              onChange={e => handleChangeForm('email', e.target.value)} placeholder='coordenacao@escola.com'
            />
          </div>

          <div className='perfil-grupo'>
            <label className='perfil-label'>Senha inicial</label>
            <div style={{ position: 'relative' }}>
              <input
                key={camposComErro.includes('senha') ? `senha-erro-${animacaoErro}` : 'senha'}
                className={`perfil-input ${camposComErro.includes('senha') ? 'perfil-input-erro' : ''}`}
                type={mostrarSenha ? 'text' : 'password'}
                value={form.senha}
                onChange={e => handleChangeForm('senha', e.target.value)}
                placeholder='Mínimo 6 caracteres'
                style={{ paddingRight: 80 }}
              />
              <button
                type='button'
                onClick={() => setMostrarSenha(!mostrarSenha)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--texto-sec)', display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className='upload-btn' type='button' onClick={handleCriarNovo} disabled={salvando} style={{ marginTop: '12px' }}>
            {salvando ? 'Criando conta...' : 'Criar Conta de Coordenador'}
          </button>
        </div>
      )}

      {aba === 'promover' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="perfil-grupo" style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={18} color="var(--texto-sec)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              className="perfil-input" 
              placeholder="Buscar professor por nome ou e-mail..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ paddingLeft: 42 }}
            />
          </div>

          {carregandoLista ? (
            <p style={{ fontSize: 13, color: 'var(--texto-sec)' }}>Buscando professores...</p>
          ) : professoresFiltrados.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--texto-sec)', padding: '16px 0' }}>
              Nenhum professor encontrado para promoção.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {professoresFiltrados.map((prof) => (
                <div key={prof.id} className='professor-card' style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10,
                  background: 'var(--bg)', border: '1px solid var(--borda)',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#6F3B9D', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600
                  }}>
                    {(prof.nome || prof.email || '?').charAt(0).toUpperCase()}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)' }}>{prof.nome || 'Sem nome'}</div>
                    <div style={{ fontSize: 12, color: 'var(--texto-sec)' }}>{prof.email}</div>
                  </div>

                  <button
                    className='upload-btn'
                    onClick={() => solicitarPromocao(prof)}
                    disabled={promovendoId === prof.id}
                    style={{ 
                      width: 'auto', padding: '8px 16px', margin: 0, 
                      display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 
                    }}
                  >
                    <ShieldPlus size={16} />
                    {promovendoId === prof.id ? 'Promovendo...' : 'Promover'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {professorParaPromover && (
        <ModalConfirmarPromover
          professor={professorParaPromover}
          onConfirmar={executarPromocao}
          onCancelar={() => setProfessorParaPromover(null)}
        />
      )}
    </div>
  )
}