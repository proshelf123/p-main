// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { Bell, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore"
import { db } from "../firebase"
import {
  marcarComoLida,
  marcarTodasComoLidas,
} from "../notificacoes/notificacoes"
import "./notificacoes.css"

const ICONES_TIPO = {
  turma: "🏫",
  horario: "🗓️",
  calendario: "📅",
  aviso: "📢",
}

export default function NotificationBell({ uid }) {
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState([])
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const botaoRef = useRef(null)

  useEffect(() => {
    if (!uid) return

    const ref = query(
      collection(db, "users", uid, "notificacoes"),
      orderBy("criadoEm", "desc"),
      limit(30)
    )

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setNotificacoes(lista)
    })

    return () => unsubscribe()
  }, [uid])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  function abrirDropdown() {
    if (botaoRef.current) {
      const rect = botaoRef.current.getBoundingClientRect()
      setPosicao({
        top: rect.bottom + 8,
        left: rect.right - 340, // largura do dropdown = 340px
      })
    }
    setAberto((prev) => !prev)
  }

  async function handleClickNotificacao(notif) {
    if (!notif.lida) {
      await marcarComoLida(uid, notif.id)
    }
    if (notif.link) {
      window.location.href = notif.link // troque por navigate() do react-router se preferir
    }
    setAberto(false)
  }

  async function handleMarcarTodasLidas() {
    await marcarTodasComoLidas(uid, notificacoes)
  }

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
      <button
        ref={botaoRef}
        className="notif-bell-btn"
        onClick={abrirDropdown}
        aria-label="Notificações"
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="notif-badge">{naoLidas > 9 ? "9+" : naoLidas}</span>
        )}
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
                {naoLidas > 0 && (
                  <button
                    className="notif-marcar-lidas"
                    onClick={handleMarcarTodasLidas}
                  >
                    <Check size={14} /> Marcar todas como lidas
                  </button>
                )}
              </div>

              <div className="notif-lista">
                {notificacoes.length === 0 && (
                  <div className="notif-vazio">Nenhuma notificação por aqui.</div>
                )}

                {notificacoes.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${
                      !n.lida ? "notif-item-nao-lida" : ""
                    }`}
                    onClick={() => handleClickNotificacao(n)}
                  >
                    <span className="notif-item-icone">
                      {ICONES_TIPO[n.tipo] || "🔔"}
                    </span>
                    <div className="notif-item-conteudo">
                      <strong>{n.titulo}</strong>
                      <p>{n.mensagem}</p>
                    </div>
                    {!n.lida && <span className="notif-dot" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}