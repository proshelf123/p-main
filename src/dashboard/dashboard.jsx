// src/dashboard/dashboard.jsx
// ═ VERSÃO ATUALIZADA COM CONFIGURAÇÕES ═

import './dashboard.css'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import {
  buscarPerfil,
  buscarCronograma,
  buscarEventos,
  atualizarConfigUser,
  criarPerfil,
  buscarProximaAulaDoProfessor,
} from '../firebase/estrutura'
import {
  aplicarTemaEscuro,
  buscarTemaLegado,
  buscarTemaLocal,
  removerTemaLegado,
  removerTemaVisual,
  salvarTemaLocal,
} from '../tema'
import Logo from '../assets/Group 32 (2).png'
import { CircleUserRound, UserRound, Settings, LogOut, Users, Menu, X, Palette, BookOpenCheck, ChevronDown } from 'lucide-react'
import Bemvindo from './Bem-vindo'
import Cronogramas from '../secoes/Cronogramas'
import Turmas from '../secoes/Turmas'
import Arquivos from '../secoes/Arquivos'
import Calendario from '../secoes/Calendario'
import Configuracoes from '../secoes/config'
import Perfil from '../perfil/Perfil'
import NotificationBell from '../notificacoes/notificacoes.jsx'
import IconePerfil from '../assets/Frame 4.png'
import LogoDarkMode from '../assets/PROSHELF COM LIVROSD.png'
import NotificationToast from '../notificacoes/notificacaoToast.jsx'
import useNotificacoes from "../notificacoes/useNotificacoes"
import CadastroProfessores from '../coordenador/CadastroProfessores'
import CoresDisciplinas from '../coordenador/CoresDisciplinas'
import ProfessoresDisciplinas from '../coordenador/ProfessoresDisciplinas'
import { Plus } from 'lucide-react'
import ModalNovaTurmaUnificada from '../coordenador/ModalNovaTurmaUnificada'

const MotionDiv = motion.div

const SECOES_PROFESSOR = ['Início', 'Cronogramas', 'Turmas', 'Arquivos', 'Calendário']
const SECOES_COORDENADOR = ['Professores', 'Cores', 'Disciplinas']

function Dashboard() {
  const navigate = useNavigate()
  const [uid, setUid]               = useState(null)
  const [professor, setProfessor]   = useState(null)
  const [secaoAtiva, setSecaoAtiva] = useState('Início')
  const [cronogramas, setCronogramas] = useState([])
  const [cronogramasCarregados, setCronogramasCarregados] = useState(false)
  const [eventos, setEventos]       = useState([])
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [perfilAberto, setPerfilAberto]     = useState(false)
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)
  const [coordAberto, setCoordAberto] = useState(false)
  const dropdownRef = useRef(null)
const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false)
  const eCoordenador = professor?.role === 'coordenador'

  // ── Listener único: alimenta o sino e dispara os toasts em tempo real ──
  const { notificacoes } = useNotificacoes(uid)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        removerTemaVisual()
        navigate('/login')
        return
      }
      setUid(user.uid)
      setCronogramasCarregados(false)
      let dados = await buscarPerfil(user.uid)
      if (!dados) {
        await criarPerfil(user.uid, user.email)
        dados = await buscarPerfil(user.uid)
      }
      dados = {
        ...(dados || {}),
        id: dados?.id || user.uid,
        email: dados?.email || user.email || '',
      }
      setProfessor(dados)

      let temaEscuro = typeof dados?.darkMode === 'boolean'
        ? dados.darkMode
        : buscarTemaLocal(user.uid)

      const precisaMigrarTema = temaEscuro === null
      if (precisaMigrarTema) {
        temaEscuro = buscarTemaLegado() ?? false
      }

      salvarTemaLocal(user.uid, temaEscuro)
      removerTemaLegado()
      aplicarTemaEscuro(temaEscuro)

      if (precisaMigrarTema) {
        try {
          await atualizarConfigUser(user.uid, { darkMode: temaEscuro })
        } catch (erro) {
          console.error('Erro ao migrar preferência de tema:', erro)
        }
      }

      const listaC = await buscarCronograma(user.uid, dados)
      setCronogramas(listaC)
      setCronogramasCarregados(true)

      const listaE = await buscarEventos(user.uid, dados)
      setEventos(listaE)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickFora(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  async function handleSair() {
    const temaAnterior = document.documentElement.classList.contains('dark-mode')
    removerTemaVisual()
    removerTemaLegado()
    try {
      await signOut(auth)
      navigate('/login')
    } catch (erro) {
      aplicarTemaEscuro(temaAnterior)
      console.error('Erro ao sair da conta:', erro)
    }
  }

  function handleCronogramasAtualizados(lista) {
    setCronogramas(lista)
    setCronogramasCarregados(true)
  }

  const proximaAulaProfessor = buscarProximaAulaDoProfessor(cronogramas, professor)
  const cronogramasDashboard = professor?.role === 'professor'
    ? (proximaAulaProfessor ? [proximaAulaProfessor] : [])
    : cronogramas

  function renderSecao() {
    switch (secaoAtiva) {
      case 'Início':
        return (
          <Bemvindo
            professor={professor}
            uid={uid}
            cronogramas={cronogramasDashboard}
            eventos={eventos}
            onIrCronogramas={() => setSecaoAtiva('Cronogramas')}
            onIrCalendario={() => setSecaoAtiva('Calendário')}
          />
        )
      case 'Cronogramas':
        return (
          <Cronogramas
            uid={uid}
            professor={professor}
            cronogramasIniciais={cronogramas}
            cronogramasCarregados={cronogramasCarregados}
            onCronogramasAtualizados={handleCronogramasAtualizados}
          />
        )
      case 'Turmas':         return <Turmas uid={uid} professor={professor} />
      case 'Arquivos':       return <Arquivos uid={uid} professor={professor} />
      case 'Calendário':     return <Calendario uid={uid} professor={professor} />
      case 'Configurações':  return <Configuracoes uid={uid} professor={professor} />
      case 'Professores':    return <CadastroProfessores />
      case 'Cores':          return <CoresDisciplinas uid={uid} professor={professor} cronogramas={cronogramas} />
      case 'Disciplinas':    return <ProfessoresDisciplinas uid={uid} />
      default:               return null
    }
  }

  const secoesNav = SECOES_PROFESSOR.filter(s => s !== 'Início')

  return (
    <div className='dash-wrapper'>

      {/* ── Overlay + Gaveta mobile ── */}
      <div
        className={`nav-mobile-overlay ${menuMobileAberto ? 'aberto' : ''}`}
        onClick={() => setMenuMobileAberto(false)}
      />
      <div className={`nav-mobile-drawer ${menuMobileAberto ? 'aberto' : ''}`}>
        <span className='nav-mobile-secao-label'>Menu - Mobile</span>
        <button
          className={`nav-link ${secaoAtiva === 'Início' ? 'ativo' : ''}`}
          onClick={() => { setSecaoAtiva('Início'); setMenuMobileAberto(false) }}
        >
          Home
        </button>
        {secoesNav.map(s => (
          <button
            key={s}
            className={`nav-link ${secaoAtiva === s ? 'ativo' : ''}`}
            onClick={() => { setSecaoAtiva(s); setMenuMobileAberto(false) }}
          >
            {s}
          </button>
        ))}
        {eCoordenador && (
          <>
            <div className='nav-divisor' />
<span className='nav-mobile-secao-label'>Coordenador</span>
{/* NOVO BOTÃO NO MOBILE */}
<button
  className="nav-link nav-link-coord"
  onClick={() => { setModalNovaTurmaAberto(true); setMenuMobileAberto(false); }}
>
  <Plus size={14} /> Nova Turma
</button>

{SECOES_COORDENADOR.map(s => (
              <button
                key={s}
                className={`nav-link nav-link-coord ${secaoAtiva === s ? 'ativo' : ''}`}
                onClick={() => { setSecaoAtiva(s); setMenuMobileAberto(false) }}
              >
                {s === 'Professores'    && <Users size={14} />}
                {s === 'Cores'          && <Palette size={14} />}
                {s === 'Disciplinas'    && <BookOpenCheck size={14} />}
                {s}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── Header ── */}
      <header className='cabecalho-dashboard'>

        <div className='cabecalho-logo'>
          <img src={Logo} alt='ProShelf' className='logo-claro' />
          <img src={LogoDarkMode} alt='ProShelf' className='logo-escuro' />
        </div>

        <button
          className='nav-hamburger'
          onClick={() => setMenuMobileAberto(v => !v)}
          aria-label='Abrir menu'
        >
          {menuMobileAberto ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav>
          <ul className='lista-nav'>
            <li>
              <button
                className={`nav-link ${secaoAtiva === 'Início' ? 'ativo' : ''}`}
                onClick={() => setSecaoAtiva('Início')}
              >
                Home
              </button>
            </li>

            {secoesNav.map(s => (
              <li key={s}>
                <button
                  className={`nav-link ${secaoAtiva === s ? 'ativo' : ''}`}
                  onClick={() => setSecaoAtiva(s)}
                >
                  {s}
                </button>
              </li>
            ))}

{eCoordenador && (
  <>
    <li className='nav-divisor' />
    <li
      className='nav-coord-wrapper'
      onMouseEnter={() => setCoordAberto(true)}
      onMouseLeave={() => setCoordAberto(false)}
    >
      <button
        className={`nav-link nav-link-coord ${SECOES_COORDENADOR.includes(secaoAtiva) ? 'ativo' : ''}`}
      >
        <Users size={13} /> Coordenador
        <ChevronDown size={13} className='nav-coord-chevron' />
      </button>

      <AnimatePresence>
        {coordAberto && (
          <MotionDiv
            className='nav-coord-dropdown'
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
<div className='nav-coord-dropdown-card'>
  {/* NOVO BOTÃO DE CRIAR TURMA */}
  <button
    className="nav-coord-item"
    onClick={() => { setModalNovaTurmaAberto(true); setCoordAberto(false); }}
  >
    <Plus size={15} /> Nova Turma
  </button>
  <div className="dropdown-divisor" style={{ margin: '4px 0', background: 'var(--borda)' }} />
  
  {SECOES_COORDENADOR.map(s => (
                <button
                  key={s}
                  className={`nav-coord-item ${secaoAtiva === s ? 'ativo' : ''}`}
                  onClick={() => { setSecaoAtiva(s); setCoordAberto(false) }}
                >
                  {s === 'Professores' && <Users size={15} />}
                  {s === 'Cores'       && <Palette size={15} />}
                  {s === 'Disciplinas' && <BookOpenCheck size={15} />}
                  {s}
                </button>
              ))}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </li>
  </>
)}
          </ul>
        </nav>

        <div className='cabecalho-acoes'>
<NotificationBell uid={uid} notificacoes={notificacoes} />
          <div className='perfil-wrapper' ref={dropdownRef}>
            <button
              className='perfil-btn'
              onClick={() => setDropdownAberto(v => !v)}
              aria-label='Menu do usuário'
            >
              <img src={IconePerfil} alt='Perfil' className='perfil-icone' />
            </button>

            <AnimatePresence>
              {dropdownAberto && (
                <MotionDiv
                  className='dropdown'
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {professor?.nome && (
                    <div className='dropdown-nome'>
                      {eCoordenador ? ' ' : ''} Prof. {professor.nome.split(' ')[0]}
                    </div>
                  )}
                  <button
                    className='dropdown-item'
                    onClick={() => { setPerfilAberto(true); setDropdownAberto(false) }}
                  >
                    <UserRound size={15} /> Editar perfil
                  </button>
                  <button
                    className='dropdown-item'
                    onClick={() => { setSecaoAtiva('Configurações'); setDropdownAberto(false) }}
                  >
                    <Settings size={15} /> Configurações
                  </button>
                  <div className='dropdown-divisor' />
                  <button className='dropdown-item sair' onClick={handleSair}>
                    <LogOut size={15} /> Sair da conta
                  </button>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Conteúdo da seção ── */}
      <main className='dash-conteudo'>
        <AnimatePresence mode='wait'>
          <MotionDiv
            key={secaoAtiva}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {uid && renderSecao()}
          </MotionDiv>
        </AnimatePresence>
      </main>

      {/* ── Modal de perfil ── */}
      <AnimatePresence>
        {perfilAberto && uid && (
          <Perfil
            uid={uid}
            onFechar={async () => {
              setPerfilAberto(false)
              const dados = await buscarPerfil(uid)
              setProfessor(dados)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Toasts de notificação em tempo real ── */}
      <NotificationToast />

{modalNovaTurmaAberto && uid && (
        <ModalNovaTurmaUnificada 
          uid={uid} 
          professorLogado={professor} 
          onClose={() => setModalNovaTurmaAberto(false)} 
        />
      )}

    </div>
  )
}



export default Dashboard
