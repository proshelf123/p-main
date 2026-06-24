// src/secoes/Configuracoes.jsx

import './config.css'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'
import { atualizarConfigUser } from '../firebase/estrutura'
import { Bell, Lock, MoonIcon } from 'lucide-react'
import {
  aplicarTemaEscuro,
  buscarTemaLocal,
  removerTemaLegado,
  removerTemaVisual,
  salvarTemaLocal,
} from '../tema'

function Configuracoes({ uid, professor }) {
  const [darkMode, setDarkMode] = useState(false)
  const [notificacoes, setNotificacoes] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [modalSenha, setModalSenha] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')

  // ── Carregar configurações do usuário ──
  useEffect(() => {
    const savedDarkMode = buscarTemaLocal(uid)
      ?? (typeof professor?.darkMode === 'boolean' ? professor.darkMode : false)
    const savedNotificacoes = localStorage.getItem('notificacoes') !== 'false'
    
    setDarkMode(savedDarkMode)
    setNotificacoes(savedNotificacoes)
    
    aplicarTemaEscuro(savedDarkMode)
  }, [uid, professor?.darkMode])

  // ── Limpar mensagem após 3 segundos ──
  useEffect(() => {
    if (mensagem.texto) {
      const timeout = setTimeout(() => {
        setMensagem({ tipo: '', texto: '' })
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [mensagem.texto])

  // ── Toggle Dark Mode ──
  const handleDarkMode = async (ativo) => {
    const valorAnterior = darkMode
    setDarkMode(ativo)
    aplicarTemaEscuro(ativo)
    salvarTemaLocal(uid, ativo)
    removerTemaLegado()

    try {
      await atualizarConfigUser(uid, { darkMode: ativo })
      setMensagem({ tipo: 'sucesso', texto: 'Aparência atualizada!' })
    } catch (erro) {
      console.error('Erro ao salvar preferência de tema:', erro)
      setDarkMode(valorAnterior)
      aplicarTemaEscuro(valorAnterior)
      salvarTemaLocal(uid, valorAnterior)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar a aparência' })
    }
  }

  // ── Toggle Notificações ──
  const handleNotificacoes = async (ativo) => {
    setNotificacoes(ativo)
    localStorage.setItem('notificacoes', ativo)
    
    try {
      await atualizarConfigUser(uid, { notificacoes: ativo })
      setMensagem({ tipo: 'sucesso', texto: 'Notificações atualizadas!' })
    } catch (erro) {
  console.error('Erro real:', erro)
  setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar notificações' })
}
  }

  // ── Alterar Senha ──
  const handleAlterarSenha = async (e) => {
    e.preventDefault()
    
    if (!senhaAtual || !senhaNova || !senhaConfirm) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos' })
      return
    }

    if (senhaNova !== senhaConfirm) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não conferem' })
      return
    }

    if (senhaNova.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A senha deve ter no mínimo 6 caracteres' })
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      const credential = EmailAuthProvider.credential(user.email, senhaAtual)
      
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, senhaNova)
      
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' })
      setModalSenha(false)
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaConfirm('')
    } catch (erro) {
      if (erro.code === 'auth/wrong-password') {
        setMensagem({ tipo: 'erro', texto: 'Senha atual incorreta' })
      } else {
        setMensagem({ tipo: 'erro', texto: 'Erro ao alterar senha: ' + erro.message })
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Deslogar de todos os dispositivos ──
  const handleDeslogarDispositivos = async () => {
    if (!window.confirm('Deslogar de todos os dispositivos? Você será desconectado.')) return
    
    setLoading(true)
    removerTemaVisual()
    removerTemaLegado()
    try {
      await auth.signOut()
      setMensagem({ tipo: 'sucesso', texto: 'Desconectado de todos os dispositivos!' })
      setTimeout(() => window.location.href = '/login', 2000)
    } catch (erro) {
      aplicarTemaEscuro(darkMode)
      setMensagem({ tipo: 'erro', texto: 'Erro ao deslogar: ' + erro.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='configuracoes-container'>
      
      {/* ── Mensagem de feedback ── */}
      <AnimatePresence>
        {mensagem.texto && (
          <motion.div
            className={`msg-feedback msg-${mensagem.tipo}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {mensagem.texto}
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className='cfg-titulo'>Configurações</h1>

      {/* ── SEÇÃO: APARÊNCIA ── */}
      <motion.div
        className='cfg-card'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className='cfg-header'>
          <div className='cfg-icon' style={{ background: 'var(--roxo)' }}>
            <MoonIcon size={20} />
          </div>
          <div>
            <h2>Aparência</h2>
            <p>Personalize o visual do sistema.</p>
          </div>
        </div>

        {/* Dark Mode */}
        <div className='cfg-opcao'>
          <label>Modo escuro</label>
          <div className='toggle-switch'>
            <input
              type='checkbox'
              checked={darkMode}
              onChange={(e) => handleDarkMode(e.target.checked)}
              id='dark-toggle'
            />
            <label htmlFor='dark-toggle' className='toggle-label' />
          </div>
        </div>
      </motion.div>

      {/* ── SEÇÃO: NOTIFICAÇÕES ── */}
      <motion.div
        className='cfg-card'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className='cfg-header'>
          <div className='cfg-icon' style={{ background: '#D91E63' }}>
            <Bell size={20} />
          </div>
          <div>
            <h2>Notificações</h2>
            <p>Gerencie as notificações do sistema.</p>
          </div>
        </div>

        <div className='cfg-opcao'>
          <label>Ativar notificações do sistema</label>
          <div className='toggle-switch'>
            <input
              type='checkbox'
              checked={notificacoes}
              onChange={(e) => handleNotificacoes(e.target.checked)}
              id='notif-toggle'
            />
            <label htmlFor='notif-toggle' className='toggle-label' />
          </div>
        </div>
      </motion.div>

      {/* ── SEÇÃO: SEGURANÇA ── */}
      <motion.div
        className='cfg-card'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className='cfg-header'>
          <div className='cfg-icon' style={{ background: '#4CAF50' }}>
            <Lock size={20} />
          </div>
          <div>
            <h2>Segurança</h2>
            <p>Conta e dados</p>
          </div>
        </div>

        <button className='cfg-btn cfg-btn-primario' onClick={() => setModalSenha(true)}>
          Alterar senha
        </button>
        <button className='cfg-btn cfg-btn-secundario' onClick={handleDeslogarDispositivos}>
          Deslogar de todos os dispositivos
        </button>
        <button className='cfg-btn cfg-btn-perigo' onClick={handleDeslogarDispositivos}>
          Sair da conta
        </button>
      </motion.div>

      {/* ── FOOTER ── */}
      <div className='cfg-footer'>
        <p>ProShelf - a sua editora inteligente</p>
        <span>Versão 1.0</span>
      </div>

      {/* ── MODAL: ALTERAR SENHA ── */}
      <AnimatePresence>
        {modalSenha && (
          <motion.div
            className='modal-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && setModalSenha(false)}
          >
            <motion.div
              className='modal-content'
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Alterar Senha</h3>
              <form onSubmit={handleAlterarSenha}>
                <div className='form-group'>
                  <label>Senha atual</label>
                  <input
                    type='password'
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder='Digite sua senha atual'
                    disabled={loading}
                  />
                </div>

                <div className='form-group'>
                  <label>Nova senha</label>
                  <input
                    type='password'
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    placeholder='Digite a nova senha'
                    disabled={loading}
                  />
                </div>

                <div className='form-group'>
                  <label>Confirmar nova senha</label>
                  <input
                    type='password'
                    value={senhaConfirm}
                    onChange={(e) => setSenhaConfirm(e.target.value)}
                    placeholder='Confirme a nova senha'
                    disabled={loading}
                  />
                </div>

                <div className='modal-acoes'>
                  <button
                    type='button'
                    className='btn-modal btn-modal-cancelar'
                    onClick={() => !loading && setModalSenha(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    className='btn-modal btn-modal-confirmar'
                    disabled={loading}
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Configuracoes
