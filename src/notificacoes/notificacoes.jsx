import { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { useNavigate } from "react-router-dom"
// Adicionamos o ícone Trash2 do lucide-react
import { Bell, Check, School, Megaphone, CalendarClock, Trash2 } from "lucide-react" 
import { motion, AnimatePresence } from "framer-motion"
import {
  marcarComoLida,
  marcarTodasComoLidas,
  excluirNotificacao,      // <-- Importando a nova função
  limparTodasNotificacoes  // <-- Importando a nova função
} from "../notificacoes/notificacoes"
import "./notificacoes.css"

const ICONES_TIPO = {
  turma: <School />,
  horario: <CalendarClock />,
  calendario: <CalendarClock />,
  aviso: <Megaphone />,
}

export default function NotificationBell({ uid, notificacoes = [] }) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const botaoRef = useRef(null)
  const navigate = useNavigate()

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  function abrirDropdown() {
    if (botaoRef.current) {
      const rect = botaoRef.current.getBoundingClientRect()
      const larguraDropdown = 340
      
      let leftCalculado = rect.right - larguraDropdown
      if (leftCalculado < 16) {
        leftCalculado = 16
      }

      setPosicao({
        top: rect.bottom + 8,
        left: leftCalculado,
      })
    }
    setAberto((prev) => !prev)
  }

  async function handleClickNotificacao(notif) {
    if (!notif.lida) {
      await marcarComoLida(uid, notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
    }
    setAberto(false)
  }

  async function handleMarcarTodasLidas() {
    await marcarTodasComoLidas(uid, notificacoes)
  }

  // --- NOVAS FUNÇÕES DE EXCLUSÃO ---
  async function handleExcluirIndividual(e, notifId) {
    e.stopPropagation() // Impede que o clique na lixeira abra o link da notificação
    await excluirNotificacao(uid, notifId)
  }

  async function handleLimparTodas() {
    await limparTodasNotificacoes(uid, notificacoes)
  }
  // ---------------------------------

  useEffect(() => {
    function handleClickFora(e) {
      if (botaoRef.current && !botaoRef.current.contains(e.target)) {
        const dropdownEl = document.getElementById("notif-dropdown-portal")
        if (dropdownEl && !dropdownEl.contains(e.target)) {
          setAberto(false)
        }
      }
    }
    document.addEventListener("mousedown", handleClickFora)
    return () => document.removeEventListener("mousedown", handleClickFora)
  }, [])

  return (
    <>
      <button ref={botaoRef} className="notif-bell-btn" onClick={abrirDropdown}>
        <Bell size={20} />
        {naoLidas > 0 && <span className="notif-badge">{naoLidas > 9 ? "9+" : naoLidas}</span>}
      </button>

      {ReactDOM.createPortal(
        <AnimatePresence>
          {aberto && (
            <motion.div
              id="notif-dropdown-portal"
              className="notif-dropdown"
              style={{ top: posicao.top, left: posicao.left }}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="notif-dropdown-header">
                <span>Notificações</span>
                <div className="notif-acoes-topo">
                  {naoLidas > 0 && (
                    <button className="notif-acao-btn" onClick={handleMarcarTodasLidas} title="Marcar lidas">
                      <Check size={14} />
                    </button>
                  )}
                  {notificacoes.length > 0 && (
                    <button className="notif-acao-btn notif-btn-perigo" onClick={handleLimparTodas} title="Limpar tudo">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="notif-lista">
                {notificacoes.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="notif-vazio"
                  >
                    Nenhuma notificação por aqui.
                  </motion.div>
                )}

                {/* AnimatePresence para gerenciar a entrada e saída dos itens da lista */}
                <AnimatePresence initial={false}>
                  {notificacoes.map((n) => (
                    <motion.div
                      key={n.id}
                      layout // Faz os itens vizinhos deslizarem suavemente para preencher o vazio
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ 
                        opacity: 0, 
                        x: 50, 
                        scale: 0.9,
                        transition: { duration: 0.2 } 
                      }}
                      className={`notif-item ${!n.lida ? "notif-item-nao-lida" : ""}`}
                      onClick={() => handleClickNotificacao(n)}
                    >
                      <span className="notif-item-icone">
                        {ICONES_TIPO[n.tipo] || "🔔"}
                      </span>
                      
                      <div className="notif-item-conteudo">
                        <strong>{n.titulo}</strong>
                        <p>{n.mensagem}</p>
                      </div>

                      <button
                        className="notif-btn-excluir"
                        onClick={(e) => handleExcluirIndividual(e, n.id)}
                      >
                        <Trash2 size={16} />
                      </button>

                      {!n.lida && <span className="notif-dot" />}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}