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

import { db, defaultDb } from "../firebase"

const BANCOS_BUSCA = [db, defaultDb].filter(Boolean)

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

// Retorna as variantes de role que devem ser buscadas com ==
// Separado em múltiplas queries simples para evitar índice composto
function variantesDeRole(role) {
  const normalizada = normalizarTexto(role)
  const aliases = {
    professor: ["professor", "professora", "docente"],
    coordenador: ["coordenador", "coordenadora", "coordenacao", "coordenação"],
  }

  const valores = [
    String(role || "").trim(),
    normalizada,
    normalizada.charAt(0).toUpperCase() + normalizada.slice(1),
    ...(aliases[normalizada] || []),
  ]

  return [...new Set(valores.filter(Boolean))]
}

function extrairUidDoProfessorVinculado(idDocumento, dados) {
  const uid =
    dados.uid ||
    dados.userId ||
    dados.userUid ||
    dados.authUid ||
    dados.professorId ||
    ""

  if (uid) return String(uid)

  if (idDocumento && !idDocumento.includes("@") && !idDocumento.includes("_")) {
    return idDocumento
  }

  return ""
}

async function buscarUidsUsuariosPorEmails(emails, bancos = BANCOS_BUSCA) {
  const emailsValidos = [...new Set(
    emails
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(Boolean)
  )]

  if (emailsValidos.length === 0) return []

  const consultas = bancos.flatMap((banco) =>
    emailsValidos.map(async (email) => {
      try {
        const snap = await getDocs(
          query(collection(banco, "users"), where("email", "==", email))
        )
        return snap.docs.map((documento) => documento.id)
      } catch (erro) {
        console.warn("Não foi possível buscar UID por email neste banco:", erro)
        return []
      }
    })
  )

  const resultados = await Promise.all(consultas)
  return [...new Set(resultados.flat())]
}

async function buscarUidsProfessoresVinculados(banco) {
  const snap = await getDocs(collection(banco, "professores_escola"))
  const uidsDiretos = []
  const emails = []

  snap.docs.forEach((documento) => {
    const dados = documento.data()
    const uid = extrairUidDoProfessorVinculado(documento.id, dados)

    if (uid) uidsDiretos.push(uid)
    if (dados.email) emails.push(dados.email)
  })

  const uidsPorEmail = await buscarUidsUsuariosPorEmails(emails)
  return [...new Set([...uidsDiretos, ...uidsPorEmail])]
}

/**
 * Busca os UIDs dos usuários por role.
 *
 * USA where("role", "==", variante) em série para evitar índice composto
 * que causava "The query requires an index" no Firestore.
 */
export async function buscarUidsPorRole(role) {
  try {
    if (!role) {
      console.error("Role não informada em buscarUidsPorRole.")
      return []
    }

    const roleNormalizada = String(role).trim()
    const variantes = variantesDeRole(roleNormalizada)

    // Faz uma query simples (==) por variante — sem índice composto
    const resultadosUsers = await Promise.all(
      BANCOS_BUSCA.flatMap((banco) =>
        variantes.map(async (variante) => {
          try {
            const snap = await getDocs(
              query(
                collection(banco, "users"),
                where("role", "==", variante)   // <-- == simples, sem índice
              )
            )
            return snap.docs.map((d) => d.id)
          } catch (erro) {
            console.warn(`Não foi possível buscar role "${variante}":`, erro)
            return []
          }
        })
      )
    )

    let uids = [...new Set(resultadosUsers.flat())]

    // Fallback: busca em professores_escola se não achou ninguém
    if (uids.length === 0 && normalizarTexto(roleNormalizada) === "professor") {
      const resultadosVinculos = await Promise.all(
        BANCOS_BUSCA.map(async (banco) => {
          try {
            return await buscarUidsProfessoresVinculados(banco)
          } catch (erro) {
            console.warn("Não foi possível buscar professores_escola:", erro)
            return []
          }
        })
      )

      uids = [...new Set(resultadosVinculos.flat())]
      console.log("Fallback professores_escola encontrou UIDs:", uids.length)
    }

    console.log(`Usuários encontrados com role "${roleNormalizada}":`, uids.length)
    console.log("UIDs encontrados:", uids)

    return uids
  } catch (erro) {
    console.error(`Erro ao buscar usuários com role "${role}":`, erro)
    return []
  }
}

/**
 * Cria uma notificação para um ou mais usuários.
 *
 * Caminho: users/{uid}/notificacoes/{notifId}
 */
export async function criarNotificacao({
  titulo,
  mensagem,
  tipo = "aviso",
  link = null,
  destinatarioUids = [],
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  try {
    if (!titulo || !mensagem) {
      console.error("Título e mensagem são obrigatórios.")
      return { sucesso: false, notificacoesCriadas: 0, erro: "Título e mensagem são obrigatórios." }
    }

    if (!Array.isArray(destinatarioUids)) {
      console.error("destinatarioUids precisa ser um array.")
      return { sucesso: false, notificacoesCriadas: 0, erro: "destinatarioUids precisa ser um array." }
    }

    const uidsValidos = [
      ...new Set(
        destinatarioUids.filter((uid) => typeof uid === "string" && uid.trim() !== "")
      ),
    ]

    if (uidsValidos.length === 0) {
      console.warn("Nenhum destinatário encontrado para a notificação.")
      return { sucesso: false, notificacoesCriadas: 0, motivo: "Nenhum destinatário encontrado." }
    }

    const batch = writeBatch(db)

    uidsValidos.forEach((uid) => {
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

    console.log("Notificações criadas:", uidsValidos.length)
    return { sucesso: true, notificacoesCriadas: uidsValidos.length }
  } catch (erro) {
    console.error("Erro ao criar notificação:", erro)
    return { sucesso: false, notificacoesCriadas: 0, erro: erro.message || "Erro desconhecido." }
  }
}

/**
 * Cria notificação para todos os usuários de uma role.
 */
export async function criarNotificacaoPorRole({
  role,
  titulo,
  mensagem,
  tipo = "aviso",
  link = null,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  try {
    const uids = await buscarUidsPorRole(role)

    console.log(`Criando notificação para role "${role}". UIDs encontrados:`, uids)

    return await criarNotificacao({
      titulo,
      mensagem,
      tipo,
      link,
      destinatarioUids: uids,
      criadoPorUid,
      criadoPorNome,
    })
  } catch (erro) {
    console.error(`Erro ao criar notificação para role "${role}":`, erro)
    return { sucesso: false, notificacoesCriadas: 0, erro: erro.message || "Erro desconhecido." }
  }
}

/**
 * Atalho para notificar todos os coordenadores.
 */
export async function notificarCoordenadores({
  titulo,
  mensagem,
  tipo = "solicitacao",
  link = null,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  return await criarNotificacaoPorRole({
    role: "coordenador",
    titulo,
    mensagem,
    tipo,
    link,
    criadoPorUid,
    criadoPorNome,
  })
}

/**
 * Atalho para notificar todos os professores.
 */
export async function notificarProfessores({
  titulo,
  mensagem,
  tipo = "aviso",
  link = null,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  return await criarNotificacaoPorRole({
    role: "professor",
    titulo,
    mensagem,
    tipo,
    link,
    criadoPorUid,
    criadoPorNome,
  })
}

/**
 * Marca uma notificação como lida.
 */
export async function marcarComoLida(uid, notifId) {
  try {
    if (!uid || !notifId) return
    const notifRef = doc(db, "users", uid, "notificacoes", notifId)
    await updateDoc(notifRef, {
      lida: true,
      lidaEm: serverTimestamp(),
    })
  } catch (erro) {
    console.error("Erro ao marcar notificação como lida:", erro)
  }
}

/**
 * Marca todas as notificações como lidas.
 */
export async function marcarTodasComoLidas(uid, notificacoes = []) {
  try {
    if (!uid || notificacoes.length === 0) return

    const naoLidas = notificacoes.filter((n) => !n.lida)
    if (naoLidas.length === 0) return

    const batch = writeBatch(db)

    naoLidas.forEach((notificacao) => {
      const notifRef = doc(db, "users", uid, "notificacoes", notificacao.id)
      batch.update(notifRef, {
        lida: true,
        lidaEm: serverTimestamp(),
      })
    })

    await batch.commit()
  } catch (erro) {
    console.error("Erro ao marcar todas as notificações como lidas:", erro)
  }
}