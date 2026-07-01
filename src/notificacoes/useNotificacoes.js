// src/hooks/useNotificacoes.js
//
// UM ÚNICO listener em users/{uid}/notificacoes que atende dois consumidores:
//   1. A lista do sino  -> retornada em `notificacoes`
//   2. Os toasts        -> dispara o evento "proshelf:toast" para cada
//                          notificação NOVA e não-lida que chega.
//
// Isso substitui os DOIS onSnapshot que existiam antes (um no NotificationBell
// e outro no useToastNotificacoes) por um só — metade das leituras no Firestore.
//
// USO (uma vez, no componente raiz do dashboard):
//   const { notificacoes } = useNotificacoes(uid)
//   ...
//   <NotificationBell uid={uid} notificacoes={notificacoes} />
//   <NotificationToast />

import { useEffect, useRef, useState } from "react"
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore"
import { db } from "../firebase"

const LIMITE = 30

export default function useNotificacoes(uid) {
  const [notificacoes, setNotificacoes] = useState([])
  const vistos = useRef(new Set())          // ids já processados (evita toast repetido)
  const primeiraLeitura = useRef(true)      // não dispara toast na carga inicial

  useEffect(() => {
    if (!uid) return

    // Reset ao trocar de usuário
    vistos.current = new Set()
    primeiraLeitura.current = true

    const baseRef = collection(db, "users", uid, "notificacoes")

    const aplicar = (snapshot) => {
      // 1) Atualiza a lista do sino
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      lista.sort(
        (a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0)
      )
      setNotificacoes(lista.slice(0, LIMITE))

      // 2) Na primeira carga: só registra os ids existentes, sem toast
      if (primeiraLeitura.current) {
        snapshot.docs.forEach((d) => vistos.current.add(d.id))
        primeiraLeitura.current = false
        return
      }

      // 3) Depois disso: toast para cada nova não-lida
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return
        const docRef = change.doc
        if (vistos.current.has(docRef.id)) return
        vistos.current.add(docRef.id)

        const data = docRef.data()
        if (data.lida) return

        window.dispatchEvent(
          new CustomEvent("proshelf:toast", {
            detail: {
              id: docRef.id,
              titulo: data.titulo || "",
              mensagem: data.mensagem || "",
              tipo: data.tipo || "aviso",
              link: data.link || null,
            },
          })
        )
      })
    }

    let unsubscribe = onSnapshot(
      query(baseRef, orderBy("criadoEm", "desc"), limit(LIMITE)),
      aplicar,
      (erro) => {
        console.error("Erro ao escutar notificações (ordenadas):", erro)
        // Fallback sem orderBy (a ordenação já é refeita no cliente)
        unsubscribe = onSnapshot(baseRef, aplicar, (fallbackErro) =>
          console.error("Erro ao escutar notificações:", fallbackErro)
        )
      }
    )

    return () => {
      unsubscribe()
      primeiraLeitura.current = true
    }
  }, [uid])

  return { notificacoes }
}