// src/notificacoes/NotificationToast.jsx
//
// Renderiza a fila de toasts via ReactDOM.createPortal em document.body.
// Escuta o evento customizado "proshelf:toast" emitido pelo useToastNotificacoes.
//
// Uso:
//   1. Coloque <NotificationToast /> uma vez dentro do layout do dashboard.
//   2. No mesmo componente (ou pai), chame useToastNotificacoes(uid).

import { useState, useEffect, useCallback, useRef } from "react"
import ReactDOM from "react-dom"
import { useNavigate } from "react-router-dom"
import "./notificacaoToast.css"

// Mapa de tipos → ícone CSS (classe Tabler) e cor de acento
const CONFIG_TIPO = {
  turma:      { icone: "ti-school",         cor: "#6F3B9D" },
  horario:    { icone: "ti-clock-edit",      cor: "#188AF5" },
  calendario: { icone: "ti-calendar-event",  cor: "#0BBB3A" },
  aviso:      { icone: "ti-speakerphone",    cor: "#FF9D00" },
  solicitacao:{ icone: "ti-file-plus",       cor: "#FF9D00" },
}

const FALLBACK_CONFIG = { icone: "ti-bell", cor: "#6F3B9D" }
const DURACAO_MS = 4500
const MAX_TOASTS = 3

export default function NotificationToast() {
  const [toasts, setToasts] = useState([])
  const navigate = useNavigate()

  const remover = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, saindo: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 250)
  }, [])

  useEffect(() => {
    function onToast(e) {
      const { id, titulo, mensagem, tipo, link } = e.detail

      setToasts((prev) => {
        // Evita duplicata se o mesmo id chegar duas vezes
        if (prev.some((t) => t.id === id)) return prev

        const novo = { id, titulo, mensagem, tipo, link, saindo: false }
        const fila = [novo, ...prev].slice(0, MAX_TOASTS)
        return fila
      })

      // Auto-dismiss
      setTimeout(() => remover(id), DURACAO_MS)
    }

    window.addEventListener("proshelf:toast", onToast)
    return () => window.removeEventListener("proshelf:toast", onToast)
  }, [remover])

  function handleClick(toast) {
    remover(toast.id)
    if (toast.link) {
      navigate(toast.link)
    }
  }

  if (toasts.length === 0) return null

  return ReactDOM.createPortal(
    <div className="ps-toast-container" role="region" aria-label="Notificações">
      {toasts.map((toast) => {
        const cfg = CONFIG_TIPO[toast.tipo] || FALLBACK_CONFIG
        return (
          <div
            key={toast.id}
            className={`ps-toast ${toast.saindo ? "ps-toast--saindo" : ""}`}
            role="alert"
            aria-live="assertive"
          >
            {/* Barra de progresso */}
            <div
              className="ps-toast__barra"
              style={{ background: cfg.cor }}
            />

            {/* Ícone */}
            <div
              className="ps-toast__icone"
              style={{ background: `${cfg.cor}18` }}
              aria-hidden="true"
            >
              <i
                className={`ti ${cfg.icone}`}
                style={{ color: cfg.cor }}
              />
            </div>

            {/* Corpo — clicável se tiver link */}
            <div
              className={`ps-toast__corpo ${toast.link ? "ps-toast__corpo--link" : ""}`}
              onClick={() => toast.link && handleClick(toast)}
            >
              <span className="ps-toast__titulo">{toast.titulo}</span>
              <span className="ps-toast__msg">{toast.mensagem}</span>
            </div>

            {/* Botão fechar */}
            <button
              className="ps-toast__fechar"
              onClick={() => remover(toast.id)}
              aria-label="Fechar notificação"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}