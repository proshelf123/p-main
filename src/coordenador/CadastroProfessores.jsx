// src/coordenador/CadastroProfessores.jsx
//
// Usa Cloud Functions para criar a conta do professor
// sem deslogar o coordenador.

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions, db } from '../firebase'
import './coordenador.css'
import { Trash2 } from 'lucide-react';
import { TriangleAlert } from 'lucide-react';
import { CircleCheckBig } from 'lucide-react';


const FORM_INICIAL = { nome: '', email: '', senha: '', nomePDF: '' }

export default function CadastroProfessores() {
  const [professores, setProfessores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(FORM_INICIAL)
  const [salvando, setSalvando]       = useState(false)
  const [salvo, setSalvo]             = useState(false)
  const [erro, setErro]               = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => { carregarProfessores() }, [])

  async function carregarProfessores() {
    const snap = await getDocs(collection(db, 'professores_escola'))
    setProfessores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErro('')
  }

  async function handleSalvar() {
    if (!form.nome || !form.email || !form.senha || !form.nomePDF) {
      setErro('Preencha todos os campos.'); return
    }
    if (!form.email.includes('@')) {
      setErro('Digite um e-mail válido.'); return
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.'); return
    }

    setSalvando(true)
    setErro('')

    try {
      const criarProfessor = httpsCallable(functions, 'criarProfessor')

      await criarProfessor({
        nome:    form.nome,
        email:   form.email,
        senha:   form.senha,
        nomePDF: form.nomePDF,
      })

      setForm(FORM_INICIAL)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
      await carregarProfessores()

    } catch (error) {
      setErro(error.message || 'Erro ao cadastrar professor.')
    }

    setSalvando(false)
  }

  async function handleDeletar(email) {
    if (!confirm('Remover este professor? Isso apaga a conta de acesso dele.')) return

    try {
      const deletarProfessor = httpsCallable(functions, 'deletarProfessor')
      await deletarProfessor({ email })
      await carregarProfessores()
    } catch (error) {
      alert('Erro ao remover: ' + error.message)
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
            <button onClick={() => setMostrarSenha(v => !v)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#888', fontFamily: 'Poppins, sans-serif',
            }}>
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <span style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
            O professor pode trocar a senha depois em Configurações
          </span>
        </div>

        <div className='perfil-grupo'>
          <label className='perfil-label'>Nome no PDF do horário (MAIÚSCULAS)</label>
          <input
            className='perfil-input' name='nomePDF' value={form.nomePDF}
            onChange={e => setForm({ ...form, nomePDF: e.target.value.toUpperCase() })}
            placeholder='Ex: GETULIO, MARIA JOSÉ, ADILSON'
            style={{ textTransform: 'uppercase' }}
          />
          <span style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
            Copie o nome exatamente como aparece no PDF do horário
          </span>
        </div>

        {erro && <div className='upload-erro'><TriangleAlert size={25}/> {erro}</div>}

        {salvo && (
          <div className='upload-sucesso'>
            <CircleCheckBig /> Professor cadastrado! Ele já pode fazer login com o e-mail e senha definidos.
          </div>
        )}

        <button className='upload-btn' onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Cadastrando...' : 'Cadastrar professor'}
        </button>
      </div>

      {/* Lista de professores */}
      <div className='sec-titulo' style={{ fontFamily: 'Poppins, sans-serif' }}>
        Professores cadastrados ({professores.length})
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#999', fontFamily: 'Poppins, sans-serif' }}>
          Carregando...
        </p>
      ) : professores.length === 0 ? (
        <p style={{ fontSize: 13, color: '#999', fontFamily: 'Poppins, sans-serif', padding: '16px 0' }}>
          Nenhum professor cadastrado ainda.
        </p>
      ) : (
        professores.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: '#f8f7fc', marginBottom: 6,
            fontFamily: 'Poppins, sans-serif',
            border: '0.5px solid #e8e4f0',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#6F3B9D', color: '#fff',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {p.nomePDF?.charAt(0) || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{p.nomePDF}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{p.email}</div>
            </div>
            <button onClick={() => handleDeletar(p.email)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, opacity: 0.4, transition: 'opacity .15s', padding: '2px 6px',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
              title='Remover professor'
            ><Trash2 size={16} /></button>
          </div>
        ))
      )}
    </div>
  )
}