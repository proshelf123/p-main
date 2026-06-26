// src/notificacoes/useToastNotificacoes.js
//
// Escuta users/{uid}/notificacoes em tempo real e emite um evento customizado
// ("proshelf:toast") para cada documento novo não lido que chegar.
//
// Uso: chame useToastNotificacoes(uid) uma vez, no componente raiz do dashboard
// (ex: Dashboard.jsx ou App.jsx), junto ao <NotificationToast />.

import { useEffect, useRef } from "react"
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "../firebase"

export function useToastNotificacoes(uid) {
  // Guarda os IDs já vistos para não re-disparar toasts em re-renders
  const vistos = useRef(new Set())
  // Controla se é a primeira carga (evita enxurrada ao montar)
  const primeiraLeitura = useRef(true)

  useEffect(() => {
    if (!uid) return

    const ref = collection(db, "users", uid, "notificacoes")
    const q = query(ref, orderBy("criadoEm", "desc"), limit(30))

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (primeiraLeitura.current) {
          // Na primeira carga, só registra os IDs já existentes — sem toast
          snapshot.docs.forEach((d) => vistos.current.add(d.id))
          primeiraLeitura.current = false
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return

          const doc = change.doc
          if (vistos.current.has(doc.id)) return
          vistos.current.add(doc.id)

          const data = doc.data()
          // Só dispara toast para notificações não lidas recém-chegadas
          if (data.lida) return

          window.dispatchEvent(
            new CustomEvent("proshelf:toast", {
              detail: {
                id: doc.id,
                titulo: data.titulo || "",
                mensagem: data.mensagem || "",
                tipo: data.tipo || "aviso",
                link: data.link || null,
              },
            })
          )
        })
      },
      (erro) => {
        console.error("[useToastNotificacoes] Erro no onSnapshot:", erro)
      }
    )

    return () => {
      unsub()
      primeiraLeitura.current = true
    }
  }, [uid])
}