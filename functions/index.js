const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

if (!getApps().length) initializeApp()

const FIRESTORE_DATABASE_ID = 'firestoreproshelf'
const CAMPOS_ROLE = ['role', 'perfil', 'tipo', 'cargo', 'papel']
const CORS_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/proshelf-8ecfd\.web\.app$/,
  /^https:\/\/proshelf-8ecfd\.firebaseapp\.com$/,
]
const PUBLIC_CALLABLE_OPTIONS = {
  region: 'us-central1',
  invoker: 'public',
  cors: CORS_ORIGINS,
}

function origemCorsPermitida(origin) {
  if (!origin) return false
  return CORS_ORIGINS.some((permitida) => permitida.test(origin))
}

function responderCors(req, res) {
  const origin = String(req.get('origin') || '')

  if (origemCorsPermitida(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    res.set('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    res.status(origemCorsPermitida(origin) ? 204 : 403).send('')
    return true
  }

  return false
}

function erroCallable(error) {
  if (error instanceof HttpsError) return error
  return new HttpsError('internal', error?.message || 'Erro interno.')
}

function callableHttp(options, handler) {
  if (!handler) {
    handler = options
    options = {}
  }

  return onRequest({ ...PUBLIC_CALLABLE_OPTIONS, ...options }, async (req, res) => {
    if (responderCors(req, res)) return

    if (req.method !== 'POST') {
      res.status(405).json({
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'Use POST para chamar esta função.',
        },
      })
      return
    }

    const authorization = String(req.get('authorization') || '')
    let auth = null

    if (authorization.startsWith('Bearer ')) {
      try {
        const token = await getAuth().verifyIdToken(authorization.slice(7))
        auth = { uid: token.uid, token }
      } catch (error) {
        console.warn('Token de autenticação inválido na callable HTTP:', error)
      }
    }

    try {
      const result = await handler({
        data: req.body?.data,
        auth,
        rawRequest: req,
      })

      res.status(200).json({ result })
    } catch (error) {
      const httpsError = erroCallable(error)
      res.status(httpsError.httpErrorCode.status).json({
        error: httpsError.toJSON(),
      })
    }
  })
}

function getDb() {
  return getFirestore(FIRESTORE_DATABASE_ID)
}

function getDefaultDb() {
  return getFirestore()
}

function sanitizarEmail(email) {
  return String(email || '').trim().toLowerCase().replace(/[@.]/g, '_')
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function variantesDeRole(role) {
  const normalizada = normalizarTexto(role)
  const aliases = {
    professor: ['professor', 'professora', 'docente'],
    coordenador: ['coordenador', 'coordenadora', 'coordenacao', 'coordenação'],
  }

  return [...new Set([
    String(role || '').trim(),
    normalizada,
    normalizada.charAt(0).toUpperCase() + normalizada.slice(1),
    ...(aliases[normalizada] || []),
  ].filter(Boolean))]
}

async function exigirCoordenador(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  }

  const perfilSnap = await getDb().doc(`users/${request.auth.uid}`).get()
  if (!perfilSnap.exists || perfilSnap.data()?.role !== 'coordenador') {
    throw new HttpsError('permission-denied', 'Apenas coordenadores podem executar esta ação.')
  }
}

async function buscarUidsUsuariosPorRole(db, role) {
  const rolesPossiveis = variantesDeRole(role).slice(0, 10)
  const uids = new Set()

  for (const campo of CAMPOS_ROLE) {
    const snap = await db.collection('users')
      .where(campo, 'in', rolesPossiveis)
      .get()

    snap.docs.forEach((documento) => uids.add(documento.id))
  }

  return [...uids]
}

async function resolverUidsPorEmails(emails) {
  const auth = getAuth()
  const uids = []
  const emailsValidos = [...new Set(
    emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean)
  )]

  for (const email of emailsValidos) {
    try {
      const user = await auth.getUserByEmail(email)
      uids.push(user.uid)
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        console.warn(`Não foi possível resolver UID do email ${email}:`, err.message)
      }
    }
  }

  return uids
}

async function buscarUidsProfessoresVinculados(db) {
  const snap = await db.collection('professores_escola').get()
  const uids = []
  const emails = []

  snap.docs.forEach((documento) => {
    const dados = documento.data() || {}
    const uid = dados.uid || dados.userId || dados.userUid || dados.authUid || dados.professorId

    if (uid) uids.push(String(uid))
    if (dados.email) emails.push(dados.email)
  })

  return [...new Set([
    ...uids,
    ...(await resolverUidsPorEmails(emails)),
  ])]
}

async function listarAuthUidsExceto(uidIgnorado) {
  const auth = getAuth()
  const uids = []
  let pageToken

  do {
    const pagina = await auth.listUsers(1000, pageToken)
    pagina.users.forEach((user) => {
      if (!user.disabled && user.uid !== uidIgnorado) {
        uids.push(user.uid)
      }
    })
    pageToken = pagina.pageToken
  } while (pageToken)

  return uids
}

async function buscarDestinatariosPorRole(role, remetenteUid) {
  const roleNormalizada = normalizarTexto(role)
  const bancos = [getDb(), getDefaultDb()]
  const uids = new Set()

  for (const db of bancos) {
    const porUsers = await buscarUidsUsuariosPorRole(db, role)
    porUsers.forEach((uid) => uids.add(uid))

    if (roleNormalizada === 'professor') {
      const porVinculos = await buscarUidsProfessoresVinculados(db)
      porVinculos.forEach((uid) => uids.add(uid))
    }
  }

  if (uids.size === 0 && roleNormalizada === 'professor') {
    const porAuth = await listarAuthUidsExceto(remetenteUid)
    porAuth.forEach((uid) => uids.add(uid))
  }

  uids.delete(remetenteUid)
  return [...uids]
}

async function criarNotificacoesNoFirestore({
  destinatarioUids,
  titulo,
  mensagem,
  tipo = 'aviso',
  link = null,
  criadoPorUid = null,
  criadoPorNome = null,
}) {
  const uids = [...new Set(
    (destinatarioUids || [])
      .map((uid) => String(uid || '').trim())
      .filter(Boolean)
  )]

  if (uids.length === 0) {
    return {
      sucesso: false,
      notificacoesCriadas: 0,
      motivo: 'Nenhum destinatário encontrado.',
    }
  }

  const db = getDb()
  const lotes = []

  for (let i = 0; i < uids.length; i += 450) {
    const batch = db.batch()
    uids.slice(i, i + 450).forEach((uid) => {
      const ref = db.collection('users').doc(uid).collection('notificacoes').doc()
      batch.set(ref, {
        titulo,
        mensagem,
        tipo,
        link,
        lida: false,
        criadoEm: FieldValue.serverTimestamp(),
        criadoPorUid,
        criadoPorNome,
      })
    })
    lotes.push(batch.commit())
  }

  await Promise.all(lotes)

  return {
    sucesso: true,
    notificacoesCriadas: uids.length,
  }
}

async function lerPerfilEmQualquerBanco(uid) {
  const [perfilProshelf, perfilDefault] = await Promise.all([
    getDb().doc(`users/${uid}`).get(),
    getDefaultDb().doc(`users/${uid}`).get(),
  ])

  if (perfilProshelf.exists) return perfilProshelf.data() || {}
  if (perfilDefault.exists) return perfilDefault.data() || {}
  return {}
}

async function sincronizarProfessoresDoAuth(uidCoordenador) {
  const auth = getAuth()
  const db = getDb()
  let pageToken
  let verificados = 0
  let sincronizados = 0

  do {
    const pagina = await auth.listUsers(1000, pageToken)

    for (const user of pagina.users) {
      verificados++

      if (user.disabled || user.uid === uidCoordenador || !user.email) continue

      const perfil = await lerPerfilEmQualquerBanco(user.uid)
      if (normalizarTexto(perfil.role) === 'coordenador') continue

      const nome =
        String(perfil.nome || perfil.displayName || user.displayName || '').trim()
        || user.email.split('@')[0]
      const email = String(user.email).trim().toLowerCase()
      const nomePDF = String(perfil.nomePDF || nome).trim().toUpperCase()
      const agora = FieldValue.serverTimestamp()

      await Promise.all([
        db.doc(`users/${user.uid}`).set({
          nome,
          nomeUsuario: perfil.nomeUsuario || '',
          instituicao: perfil.instituicao || '',
          modalidade: perfil.modalidade || 'Presencial',
          email,
          role: 'professor',
          nomePDF,
          atualizadoEm: agora,
        }, { merge: true }),
        db.doc(`professores_escola/${sanitizarEmail(email)}`).set({
          uid: user.uid,
          nome,
          email,
          nomePDF,
          atualizadoEm: agora,
        }, { merge: true }),
      ])

      sincronizados++
    }

    pageToken = pagina.pageToken
  } while (pageToken)

  return { verificados, sincronizados }
}

async function criarProfessorHandler(request) {
    await exigirCoordenador(request)

    if (request.data?.acao === 'sincronizarProfessores') {
      return await sincronizarProfessoresDoAuth(request.auth.uid)
    }

    const nome = String(request.data?.nome || '').trim()
    const email = String(request.data?.email || '').trim().toLowerCase()
    const senha = String(request.data?.senha || '')
    const nomePDF = String(request.data?.nomePDF || '').trim().toUpperCase()

    if (!nome || !email || !senha || !nomePDF) {
      throw new HttpsError('invalid-argument', 'Nome, e-mail, senha e nomePDF são obrigatórios.')
    }

    if (senha.length < 6) {
      throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.')
    }

    const auth = getAuth()
    let userRecord

    try {
      userRecord = await auth.createUser({
        email,
        password: senha,
        displayName: nome,
      })
    } catch (err) {
      if (err.code !== 'auth/email-already-exists') {
        throw new HttpsError('internal', err.message || 'Erro ao criar usuário.')
      }

      userRecord = await auth.getUserByEmail(email)
      await auth.updateUser(userRecord.uid, {
        displayName: nome,
        password: senha,
      })
    }

    const db = getDb()
    const agora = FieldValue.serverTimestamp()
    const emailId = sanitizarEmail(email)

    await Promise.all([
      db.doc(`users/${userRecord.uid}`).set({
        nome,
        nomeUsuario: '',
        instituicao: '',
        modalidade: 'Presencial',
        email,
        role: 'professor',
        nomePDF,
        criadoEm: agora,
        atualizadoEm: agora,
      }, { merge: true }),
      db.doc(`professores_escola/${emailId}`).set({
        uid: userRecord.uid,
        nome,
        email,
        nomePDF,
        atualizadoEm: agora,
      }, { merge: true }),
    ])

  return { uid: userRecord.uid }
}

exports.criarProfessor = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  criarProfessorHandler
)

exports.criarProfessorHttp = callableHttp(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  criarProfessorHandler
)

async function deletarProfessorHandler(request) {
    await exigirCoordenador(request)

    const email = String(request.data?.email || '').trim().toLowerCase()
    if (!email) {
      throw new HttpsError('invalid-argument', 'E-mail é obrigatório.')
    }

    const auth = getAuth()
    const db = getDb()
    const emailId = sanitizarEmail(email)
    const vinculoSnap = await db.doc(`professores_escola/${emailId}`).get()

    let uid = vinculoSnap.data()?.uid || ''
    try {
      const userRecord = await auth.getUserByEmail(email)
      uid = userRecord.uid
      await auth.deleteUser(uid)
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw new HttpsError('internal', err.message || 'Erro ao remover usuário.')
      }
    }

    const deletes = [db.doc(`professores_escola/${emailId}`).delete()]
    if (uid) deletes.push(db.doc(`users/${uid}`).delete())
    await Promise.allSettled(deletes)

  return { uid }
}

exports.deletarProfessor = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  deletarProfessorHandler
)

exports.deletarProfessorHttp = callableHttp(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  deletarProfessorHandler
)

exports.criarNotificacaoPorRole = onCall(
  {
    ...PUBLIC_CALLABLE_OPTIONS,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Faça login para continuar.')
    }

    const role = String(request.data?.role || '').trim()
    const titulo = String(request.data?.titulo || '').trim()
    const mensagem = String(request.data?.mensagem || '').trim()
    const tipo = String(request.data?.tipo || 'aviso').trim()
    const link = request.data?.link || null
    const criadoPorUid = request.data?.criadoPorUid || request.auth.uid
    const criadoPorNome = request.data?.criadoPorNome || null

    if (!role || !titulo || !mensagem) {
      throw new HttpsError('invalid-argument', 'Role, título e mensagem são obrigatórios.')
    }

    const destinatarioUids = await buscarDestinatariosPorRole(role, request.auth.uid)

    console.log(
      `Criando notificação para role "${role}". Destinatários encontrados: ${destinatarioUids.length}`
    )

    return criarNotificacoesNoFirestore({
      destinatarioUids,
      titulo,
      mensagem,
      tipo,
      link,
      criadoPorUid,
      criadoPorNome,
    })
  }
)
