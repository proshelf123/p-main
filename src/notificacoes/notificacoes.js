// src/notificacoes/notificacoes.js
import {
  collection,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "../firebase"

/**
 * Busca os UIDs de usuários por role (coordenador/professor).
 * Coleção "users", campo "role" — igual ao que buscarPerfil/eCoordenador já usam.
 */
export async function buscarUidsPorRole(role) {
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("role", "==", role))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => d.id)
}

/**
 * Cria uma notificação para um ou mais destinatários.
 * Cada destinatário recebe uma cópia em users/{uid}/notificacoes/{id}
 */
export async function criarNotificacao({
  titulo,
  mensagem,
  tipo,
  link = null,
  destinatarioUids,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  if (!destinatarioUids || destinatarioUids.length === 0) return

  const batch = writeBatch(db)

  destinatarioUids.forEach((uid) => {
    const notifRef = doc(collection(db, "users", uid, "notificacoes"))
    batch.set(notifRef, {
      titulo,
      mensagem,
      tipo,
      link,
      lida: false,
      criadoEm: serverTimestamp(),
      criadoPorUid,
      criadoPorNome,
    })
  })

  await batch.commit()
}

/**
 * Atalho: notifica todos os usuários de uma role.
 */
export async function criarNotificacaoPorRole({
  role,
  titulo,
  mensagem,
  tipo,
  link,
  criadoPorUid,
  criadoPorNome,
}) {
  const uids = await buscarUidsPorRole(role)
  return criarNotificacao({
    titulo,
    mensagem,
    tipo,
    link,
    destinatarioUids: uids,
    criadoPorUid,
    criadoPorNome,
  })
}

export async function marcarComoLida(uid, notifId) {
  const ref = doc(db, "users", uid, "notificacoes", notifId)
  await updateDoc(ref, { lida: true })
}

export async function marcarTodasComoLidas(uid, notificacoes) {
  const naoLidas = notificacoes.filter((n) => !n.lida)
  if (naoLidas.length === 0) return

  const batch = writeBatch(db)
  naoLidas.forEach((n) => {
    const ref = doc(db, "users", uid, "notificacoes", n.id)
    batch.update(ref, { lida: true })
  })
  await batch.commit()
}